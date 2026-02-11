import Decimal from 'decimal.js';

/**
 * Money Value Object
 * Handles precise financial calculations to avoid floating point errors.
 */
export class Money {
    /**
     * @param {number|string|Decimal} amount 
     * @param {string} currency 
     */
    constructor(amount, currency = 'THB') {
        this._amount = new Decimal(amount);
        this._currency = currency;
    }

    get amount() {
        return this._amount.toNumber();
    }

    get currency() {
        return this._currency;
    }

    /**
     * @param {Money} other 
     */
    add(other) {
        this._checkCurrency(other);
        return new Money(this._amount.plus(other._amount), this._currency);
    }

    /**
     * @param {Money} other 
     */
    subtract(other) {
        this._checkCurrency(other);
        return new Money(this._amount.minus(other._amount), this._currency);
    }

    /**
     * @param {number} multiplier 
     */
    multiply(multiplier) {
        return new Money(this._amount.times(multiplier), this._currency);
    }

    /**
     * @param {Money} other 
     */
    equals(other) {
        return (
            this._currency === other._currency && 
            this._amount.equals(other._amount)
        );
    }

    toString() {
        return `${this._amount.toFixed(2)} ${this._currency}`;
    }

    toJSON() {
        return {
            amount: this._amount.toNumber(),
            currency: this._currency
        };
    }

    static from(amount, currency = 'THB') {
        return new Money(amount, currency);
    }

    static zero(currency = 'THB') {
        return new Money(0, currency);
    }

    _checkCurrency(other) {
        if (this._currency !== other._currency) {
            throw new Error(`Currency mismatch: cannot operate ${this._currency} with ${other._currency}`);
        }
    }
}
