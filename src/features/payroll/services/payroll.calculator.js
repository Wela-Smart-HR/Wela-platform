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
     * Convert Decimal to Database Format (Satang / Integer)
     * To prevent rounding errors in DB aggregation, save as integer satangs.
     * e.g. 15000.50 THB -> 1500050
     * @param {Decimal|number} value 
     * @returns {number} Integer
     */
    static toDbSatang(value) {
        return parseInt(this.toDecimal(value).times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toString(), 10);
    }

    /**
     * Convert DB Satang back to Display Amount (THB)
     * e.g. 1500050 -> 15000.50
     * @param {number} satang 
     * @returns {number} Float (For UI calculation if needed)
     */
    static fromDbSatang(satang) {
        return this.toDecimal(satang).dividedBy(100).toNumber();
    }

    /**
     * Calculate Social Security (SSO) - Thai Labor Law Standard
     * Rule: 5% of base salary, min base 1,650, max base 17,500
     * @param {number} baseSalary 
     * @returns {number} SSO amount (Exact Float for now, UI handles Satang if needed)
     */
    static calculateSSO(baseSalary) {
        const salary = this.toDecimal(baseSalary);
        // Cap max base at 17,500 (Max 5% = 875)
        const cappedBase = Decimal.min(salary, 17500);
        // Floor at 1,650 (Min 5% = 83)
        const finalBase = Decimal.max(cappedBase, 1650);

        // 5% rate
        const sso = finalBase.times(0.05);

        // Rule according to Thai SSO: Truncate down (Usually floor) or exact rounding. We will use standard ROUND_DOWN for conservative deduction
        return sso.toDecimalPlaces(0, Decimal.ROUND_DOWN).toNumber();
    }

    /**
     * Calculate Overtime (OT) Pay - Exact Thai Labor Law Formula
     * Formula: ((Base Salary / (Working Days * Standard Daily Hours)) * Multiplier * OT Hours)
     * 
     * @param {number} baseSalary เงินเดือนฐาน
     * @param {number} workingDays จำนวนวันทำงานต่อเดือน (เช่น 30)
     * @param {number} standardDailyHours ชั่วโมงทำงานต่อวัน (เช่น 8)
     * @param {number} multiplier อัตราตัวคูณ (เช่น 1.5, 3.0)
     * @param {number} otHours จำนวนชั่วโมงโอที
     * @returns {number} จำนวนเงินโอที (THB Float)
     */
    static calculateOT(baseSalary, workingDays = 30, standardDailyHours = 8, multiplier = 1.0, otHours = 0) {
        if (!otHours || otHours <= 0) return 0;

        const salary = this.toDecimal(baseSalary);
        const days = this.toDecimal(workingDays);
        const hours = this.toDecimal(standardDailyHours);
        const mult = this.toDecimal(multiplier);
        const amt = this.toDecimal(otHours);

        // 1. Hourly Wage Base
        const divisor = days.times(hours);
        const hourlyWageBase = salary.dividedBy(divisor);

        // 2. OT Pay
        const otPay = hourlyWageBase.times(mult).times(amt);

        return otPay.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }

    /**
     * Calculate Prorated Salary (Support Monthly/Daily)
     * 
     * @param {string} type 'monthly' | 'daily'
     * @param {number} salary Base Salary
     * @param {number} daysWorked Number of days worked
     * @param {number} daysInMonth Total days in that month (e.g. 28, 30, 31)
     * @returns {number} Prorated amount
     */
    static calculateProratedSalary(type, salary, daysWorked, daysInMonth) {
        const _salary = this.toDecimal(salary);

        if (type === 'daily') {
            // Daily: Salary * DaysWorked (No Work No Pay)
            return _salary.times(daysWorked).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
        }

        // Monthly Logic
        // Guard: Full month = Full pay (Handle Feb 28 days or 31 days month)
        if (daysWorked >= daysInMonth) {
            return _salary.toNumber();
        }

        // Standard 30-day divisor rule for Proration
        const STANDARD_DIVISOR = 30;

        // Cap days worked at 30 if using 30-day divisor logic (though usually daysWorked < daysInMonth here)
        // Adjust logic: if daysWorked is 31 in a 31-day month, it's caught by guard above.
        // If daysWorked is 15 -> (Salary / 30) * 15

        return _salary.dividedBy(STANDARD_DIVISOR).times(daysWorked).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }

    /**
     * Calculate Withholding Tax (PND 1) - Progressive Rate (2024+)
     * Replaces old flat rate calculation
     * 
     * @param {number} monthlyIncome Total monthly taxable income
     * @param {number} socialSecurity Social Security deducted this month
     * @returns {number} Tax amount for this month
     */
    static calculateTax(monthlyIncome, socialSecurity) {
        const income = this.toDecimal(monthlyIncome);
        const sso = this.toDecimal(socialSecurity);

        // 1. Annualize
        const annualIncome = income.times(12);

        // 2. Expenses (50% Max 100k)
        const expenses = Decimal.min(annualIncome.times(0.5), 100000);

        // 3. Allowances (Personal 60k + SSO Year)
        // Note: SSO annual deduction is capped at actual paid.
        const allowances = new Decimal(60000).plus(sso.times(12));

        // 4. Net Taxable
        const netTaxable = annualIncome.minus(expenses).minus(allowances);

        if (netTaxable.lessThanOrEqualTo(0)) return 0;

        // 5. Progressive Tax Calculation
        let tax = new Decimal(0);
        const net = netTaxable.toNumber();

        // 0-150k Exempt
        if (net > 150000) tax = tax.plus(new Decimal(Math.min(net, 300000) - 150000).times(0.05));
        if (net > 300000) tax = tax.plus(new Decimal(Math.min(net, 500000) - 300000).times(0.10));
        if (net > 500000) tax = tax.plus(new Decimal(Math.min(net, 750000) - 500000).times(0.15));
        if (net > 750000) tax = tax.plus(new Decimal(Math.min(net, 1000000) - 750000).times(0.20));
        if (net > 1000000) tax = tax.plus(new Decimal(Math.min(net, 2000000) - 1000000).times(0.25));
        if (net > 2000000) tax = tax.plus(new Decimal(Math.min(net, 5000000) - 2000000).times(0.30));
        if (net > 5000000) tax = tax.plus(new Decimal(net - 5000000).times(0.35));

        return tax.dividedBy(12).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }

    /**
     * Calculate Late Deduction
     * Rules:
     * 1. Check Grace Period (if late <= grace, no deduction)
     * 2. Deduct = Minutes * Rate
     * 3. Cap at Max Deduction
     * 
     * @param {number} lateMinutes 
     * @param {Object} config { gracePeriod, deductionPerMinute, maxDeduction }
     * @returns {number} Deduction Amount (THB)
     */
    static calculateLateDeduction(lateMinutes, config) {
        const mins = Number(lateMinutes) || 0;
        if (mins <= 0) return 0;

        const grace = Number(config?.gracePeriod) || 0;
        const rate = Number(config?.deductionPerMinute) || 0;
        const max = Number(config?.maxDeduction) || 0;

        // 1. Grace Period Condition
        if (mins <= grace) return 0;

        // 2. Calculation (Full penalty if grace exceeded)
        let amount = new Decimal(mins).times(rate);

        // 3. Max Limit
        if (max > 0 && amount.greaterThan(max)) {
            amount = new Decimal(max);
        }

        return amount.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
    }

    /**
     * Calculate Net Total
     * @param {Object} items
     * @returns {number} Net Total
     */
    static calculateNet(items) {
        let totalIncome = this.toDecimal(items.salary || 0)
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
