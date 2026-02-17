import Decimal from 'decimal.js';

export class PayrollCalculator {

    /**
     * Parse any value to a precise Decimal
     * @param {string|number} value 
     * @returns {Decimal}
     */
    static toDecimal(value) {
        return new Decimal(value || 0);
    }

    /**
     * Calculate Social Security (SSO)
     * Rule: 5% of base salary, min base 1,650, max base 17,500 (Updated 2026)
     * @param {number} baseSalary 
     * @returns {number} SSO amount (rounded to integer)
     */
    static calculateSSO(baseSalary) {
        const salary = this.toDecimal(baseSalary);
        // Cap max base at 17,500 (New 2024-2026 Rule)
        const cappedBase = Decimal.min(salary, 17500);
        // Floor at 1,650 (Standard Min)
        const finalBase = Decimal.max(cappedBase, 1650);

        // 5% rate
        const sso = finalBase.times(0.05);

        // Round standard: Half-Up to integer (Thailand SSO usually cuts decimals, but standard rounding is safer)
        return sso.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
    }

    /**
     * Calculate Withholding Tax (PND 1) - Simple Rate
     * @param {number} income Total taxable income
     * @param {number} rate Tax rate (e.g. 0.03 for 3%)
     * @returns {number} Tax amount
     */
    static calculateTax(income, rate = 0.03) {
        const total = this.toDecimal(income);
        return total.times(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }

    /**
     * Calculate Net Total
     * @param {Object} items
     * @param {number} items.salary
     * @param {number} items.ot
     * @param {number} items.incentive
     * @param {Array<{amount: number}>} items.customIncomes
     * @param {number} items.deductions (Late/Absent)
     * @param {number} items.sso
     * @param {number} items.tax
     * @param {Array<{amount: number}>} items.customDeducts
     * @returns {number} Net Total
     */
    static calculateNet(items) {
        let totalIncome = this.toDecimal(items.salary)
            .plus(items.ot || 0)
            .plus(items.incentive || 0);

        if (items.customIncomes?.length) {
            items.customIncomes.forEach(i => totalIncome = totalIncome.plus(i.amount || 0));
        }

        let totalDeduct = this.toDecimal(items.deductions || 0) // Late/Absent
            .plus(items.sso || 0)
            .plus(items.tax || 0);

        if (items.customDeducts?.length) {
            items.customDeducts.forEach(d => totalDeduct = totalDeduct.plus(d.amount || 0));
        }

        return totalIncome.minus(totalDeduct).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }
}
