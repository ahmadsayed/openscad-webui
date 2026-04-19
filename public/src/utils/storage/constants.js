// storage/constants.js - Storage-related constants and configuration

export const STORAGE_KEYS = {
    MAIN_CODE: 'openscad_main_code',
    SIMPLE_CODE: 'openscad_simple_code',
    LAST_MODE: 'openscad_last_mode',
    HASH_INDEX: 'openscad_hash_index'
};

export const STORAGE_LIMITS = {
    MAX_TOTAL_SIZE: 50 * 1024 * 1024,  // 50MB total limit
    MAX_ENTRIES: 100,                  // Keep max 100 cached models
    CLEANUP_THRESHOLD: 0.8             // Cleanup when 80% full
};

export const STORAGE_PREFIXES = {
    CODE: 'openscad_code_',
    STL: 'openscad_stl_',
    OFF: 'openscad_off_',
    META: 'openscad_meta_'
};
