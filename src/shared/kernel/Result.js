/**
 * @template T
 * A standard Result pattern to handle Success and Failure 
 * without throwing errors (Functional Error Handling).
 */
export class Result {
    /**
     * @param {boolean} isSuccess
     * @param {T} error
     * @param {T} value
     */
    constructor(isSuccess, error, value) {
        if (isSuccess && error) {
            throw new Error("InvalidOperation: A result cannot be successful and contain an error");
        }
        if (!isSuccess && !error) {
            throw new Error("InvalidOperation: A failing result needs to contain an error message");
        }

        this.isSuccess = isSuccess;
        this.isFailure = !isSuccess;
        this.error = error;
        this._value = value;
        Object.freeze(this);
    }

    /**
     * Get the value. Throws if accessing value of a failure result.
     * @returns {T}
     */
    getValue() {
        if (!this.isSuccess) {
            throw new Error("Can't get the value of an error result. Use 'error' instead.");
        }
        return this._value;
    }

    /**
     * Create a success result
     * @template U
     * @param {U} value 
     * @returns {Result<U>}
     */
    static ok(value) {
        return new Result(true, null, value);
    }

    /**
     * Create a failure result
     * @param {string|Error} error 
     * @returns {Result<any>}
     */
    static fail(error) {
        return new Result(false, error, null);
    }

    /**
     * Combine multiple results
     * @param {Result<any>[]} results 
     * @returns {Result<any>}
     */
    static combine(results) {
        for (const result of results) {
            if (result.isFailure) return result;
        }
        return Result.ok();
    }
}
