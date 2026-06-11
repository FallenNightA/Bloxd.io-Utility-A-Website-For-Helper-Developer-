// Load Monaco Editor (Aligned to the same cdnjs path as lab.html)
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });

// --- SAFELY RETRIEVE GLOBAL DATA FROM api-data.js ---
const apiData = typeof API_DATA !== 'undefined' ? API_DATA : {
  functions: {},
  blocks: [],
  items: [],
  commonVariables: []
};

const API_FUNCTIONS = apiData.functions;
const BLOCKS = apiData.blocks;
const ITEMS = apiData.items;
const COMMON_VARS_RAW = apiData.commonVariables; // Read the raw variable data first

// --- ALL CALLBACKS (from CALLBACKS.md) ---
const CALLBACKS = [
  // Game Lifecycle
  'tick', 'onClose', 'onPlayerJoin', 'onPlayerLeave', 'doPeriodicSave',

  // Player Actions
  'onPlayerJump', 'onRespawnRequest', 'playerCommand', 'onPlayerChat',
  'onPlayerChangeBlock', 'onPlayerDropItem', 'onPlayerPickedUpItem',
  'onPlayerSelectInventorySlot', 'onPlayerMoveItemOutOfInventory', 'onPlayerMoveInvenItem',
  'onPlayerMoveItemIntoIdxs', 'onPlayerSwapInvenSlots', 'onPlayerMoveInvenItemWithAmt',
  'onPlayerAttemptAltAction', 'onPlayerAltAction', 'onPlayerClick', 'onPlayerClickUp',
  'onClientOptionUpdated', 'onMobSettingUpdated', 'onInventoryUpdated', 'onChestUpdated',

  // World Events
  'onWorldChangeBlock', 'onCreateBloxdMeshEntity', 'onEntityCollision',
  'onPlayerAttemptSpawnMob', 'onWorldAttemptSpawnMob', 'onPlayerSpawnMob',
  'onWorldAttemptDespawnMob', 'onMobDespawned', 'onPlayerAttack',

  // Combat
  'onPlayerDamagingOtherPlayer', 'onPlayerDamagingMob', 'onMobDamagingPlayer',
  'onMobDamagingOtherMob', 'onAttemptKillPlayer', 'onPlayerKilledOtherPlayer',
  'onMobKilledPlayer', 'onPlayerKilledMob', 'onMobKilledOtherMob', 'onPlayerPotionEffect',

  // Mesh Entities
  'onPlayerBreakMeshEntity', 'onPlayerDamagingMeshEntity', 'onPlayerUsedThrowable',
  'onPlayerThrowableHitTerrain',

  // Shop
  'onPlayerToggledShopMenu', 'onPlayerBoughtShopItem',

  // QTE
  'onPlayerStartChargingItem', 'onPlayerFinishChargingItem', 'onPlayerFinishQTE',

  // Chunks
  'onChunkLoaded', 'onPlayerRequestChunk',

  // Items
  'onItemDropCreated',

  // Tasks
  'onTaskClaimed'
];

// ========== MONACO EDITOR SETUP ==========
async function initEditor() {
  require(['vs/editor/editor.main'], function() {
    
    // CONFIGURE JS DEFAULTS: Keep standard language features (ES6) but block browser DOM garbage (HTML elements, media keys)
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES6,
      allowNonTsExtensions: true,
      lib: ['es6'] // Loads standard JS (Math, String, Array) but strips out DOM (HTMLTableElement, WebMediaKey, etc.)
    });

    const editor = monaco.editor.create(document.getElementById('editor-container'), {
      value: '// Write your Bloxd.io script here!\n// Example: api.giveItem(player, "Wood Sword", 1);\n// Example: api.setBlock(10, 5, 20, "Dirt");\n\n',
      language: 'javascript',
      theme: 'vs-light',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      wordWrap: 'on',
      hover: { enabled: true }
    });

    // Map common variables dynamically now that 'monaco' is fully loaded and defined
    const mappedCommonVars = COMMON_VARS_RAW.map(v => ({
      label: v.label,
      detail: v.detail,
      insertText: v.insertText,
      kind: monaco.languages.CompletionItemKind.Variable
    }));

    // Build all suggestions
    const allSuggestions = [
      // API Namespace
      {
        label: 'api',
        kind: monaco.languages.CompletionItemKind.Module,
        insertText: 'api',
        detail: 'Bloxd.io API Namespace',
        documentation: {
          value: 'Use `api.` to access all Bloxd.io functions. Example: `api.giveItem(player, "Sword", 1)`'
        }
      },

      // API Functions
      ...Object.entries(API_FUNCTIONS).map(([funcName, funcData]) => ({
        label: funcName,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: funcName,
        detail: funcData.description,
        documentation: {
          value: `
**${funcName}**
📌 ${funcData.description}

🔄 **Example**:
\`\`\`javascript
${funcData.example}
\`\`\`
`.trim()
        }
      })),

      // Blocks
      ...BLOCKS.map(block => ({
        label: block,
        kind: monaco.languages.CompletionItemKind.EnumMember,
        insertText: `"${block}"`,
        detail: 'Block ID',
        documentation: {
          value: `**Block**: \`${block}\`\n\nUse in functions like:\n- \`api.setBlock(x, y, z, "${block}")\`\n- \`api.getBlock(x, y, z) === "${block}"\``
        }
      })),

      // Items
      ...ITEMS.map(item => ({
        label: item,
        kind: monaco.languages.CompletionItemKind.EnumMember,
        insertText: `"${item}"`,
        detail: 'Item ID',
        documentation: {
          value: `**Item**: \`${item}\`\n\nUse in functions like:\n- \`api.giveItem(player, "${item}", 1)\`\n- \`api.hasItem(player, "${item}")\``
        }
      })),

      // Callbacks
      ...CALLBACKS.map(callback => ({
        label: callback,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: callback,
        detail: 'World Code Callback',
        documentation: {
          value: `**${callback}**
📌 Callback function for game events.

💡 **Example**:
\`\`\`javascript
${callback} = (${getCallbackParams(callback)}) => {
  // Your code here
};
\`\`\`
`.trim()
        }
      })),

      // Common Variables
      ...mappedCommonVars
    ];

    // Register completion provider with DOT support
    monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const textUntilPosition = lineContent.substring(0, position.column - 1);

        // If typing after "api.", suggest ONLY API functions
        if (textUntilPosition.endsWith('api.')) {
          return {
            suggestions: Object.keys(API_FUNCTIONS).map(funcName => ({
              label: funcName,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: funcName,
              detail: API_FUNCTIONS[funcName].description
            }))
          };
        }

        // Default: suggest everything
        return { suggestions: allSuggestions };
      },
      // Trigger on letters, quotes, and DOT
      triggerCharacters: ['.', '"', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
                         'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
                         'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
                         'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
    });

    // Store for other scripts
    window.editor = editor;
    window.bloxdAPI = { functions: API_FUNCTIONS, blocks: BLOCKS, items: ITEMS, callbacks: CALLBACKS };
  });
}

// Helper: Get callback parameters
function getCallbackParams(callbackName) {
  const params = {
    tick: 'ms',
    onClose: 'serverIsShuttingDown',
    onPlayerJoin: 'playerId, fromGameReset',
    onPlayerLeave: 'playerId, serverIsShuttingDown',
    onPlayerChat: 'playerId, chatMessage, channelName',
    onPlayerChangeBlock: 'playerId, x, y, z, fromBlock, toBlock, droppedItem, fromBlockInfo, toBlockInfo',
    onPlayerDropItem: 'playerId, x, y, z, itemName, itemAmount, fromIdx',
    onPlayerPickedUpItem: 'playerId, itemName, itemAmount',
    onPlayerAttack: 'playerId',
    onPlayerDamagingOtherPlayer: 'attackingPlayer, damagedPlayer, damageDealt, withItem, bodyPartHit, damagerDbId',
    onPlayerKilledOtherPlayer: 'attackingPlayer, killedPlayer, damageDealt, withItem',
    onPlayerDamagingMob: 'playerId, mobId, damageDealt, withItem, damagerDbId',
    onMobKilledPlayer: 'attackingMob, killedPlayer, damageDealt, withItem',
    onMobDamagingPlayer: 'attackingMob, damagedPlayer, damageDealt, withItem',
    onBlockStand: 'playerId, x, y, z, blockName',
    onPlayerClick: 'playerId, wasAltClick, x, y, z, block, targetEId',
    onPlayerAltAction: 'playerId, x, y, z, block, targetEId',
    onWorldChangeBlock: 'x, y, z, fromBlock, toBlock, initiatorDbId, extraInfo',
    onCreateBloxdMeshEntity: 'eId, type, initiatorId',
    onEntityCollision: 'eId, otherEId',
    onPlayerSpawnMob: 'playerId, mobId, mobType, x, y, z, mobHerdId, playSoundOnSpawn',
    onWorldSpawnMob: 'mobId, mobType, x, y, z, mobHerdId, playSoundOnSpawn',
    onPlayerUsedThrowable: 'playerId, throwableName, thrownEntityId',
    onPlayerThrowableHitTerrain: 'playerId, throwableName, thrownEntityId',
    onChunkLoaded: 'chunkId, chunk, wasPersistedChunk',
    onItemDropCreated: 'itemEId, itemName, itemAmount, x, y, z',
    onPlayerToggledShopMenu: 'playerId, isOpen',
    onPlayerBoughtShopItem: 'playerId, categoryKey, itemKey, item, userInput',
    onPlayerFinishQTE: 'playerId, qteId, result',
    onClientOptionUpdated: 'playerId, option, value',
    onMobSettingUpdated: 'mobId, setting, value',
    onInventoryUpdated: 'playerId',
    onChestUpdated: 'initiatorEId, isMoonstoneChest, x, y, z',
    onPlayerRequestChunk: 'playerId, chunkX, chunkY, chunkZ, chunkId',
    onPlayerStartChargingItem: 'playerId, itemName',
    onPlayerFinishChargingItem: 'playerId, used, itemName, duration',
    onTaskClaimed: 'playerId, taskId, isPromoTask, claimedRewards',
    onPlayerSelectInventorySlot: 'playerId, slotIndex',
    onPlayerMoveItemOutOfInventory: 'playerId, itemName, itemAmount, fromIdx, movementType',
    onPlayerMoveInvenItem: 'playerId, fromIdx, toStartIdx, toEndIdx, amt',
    onPlayerMoveItemIntoIdxs: 'playerId, start, end, moveIdx, itemAmount',
    onPlayerSwapInvenSlots: 'playerId, i, j',
    onPlayerMoveInvenItemWithAmt: 'playerId, i, j, amt',
    onPlayerAttemptAltAction: 'playerId, x, y, z, block, targetEId',
    onPlayerAttemptSpawnMob: 'playerId, mobType, x, y, z',
    onWorldAttemptSpawnMob: 'mobType, x, y, z',
    onWorldAttemptDespawnMob: 'mobId',
    onMobDespawned: 'mobId',
    onAttemptKillPlayer: 'killedPlayer, attackingLifeform',
    onPlayerDamagingMeshEntity: 'playerId, damagedId, damageDealt, withItem',
    onPlayerBreakMeshEntity: 'playerId, entityId',
    doPeriodicSave: '',
    playerCommand: 'playerId, command'
  };
  return params[callbackName] || '';
}

// Initialize the editor
initEditor();