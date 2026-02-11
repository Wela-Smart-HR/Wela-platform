import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

/**
 * ID Generator
 * Ensures unique identifiers across the system using UUID v4.
 */
export const IdGenerator = {
    /**
     * Generate a new unique ID
     * @returns {string} UUID v4
     */
    newId: () => {
        return uuidv4();
    },

    /**
     * Check if a string is a valid ID
     * @param {string} id 
     * @returns {boolean}
     */
    isValidId: (id) => {
        return uuidValidate(id);
    }
};