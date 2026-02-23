import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PayrollCalculator } from '../services/payroll.calculator';
import { IdentificationCard, Users, CoinVertical } from '@phosphor-icons/react';

export const DEDUCTION_PROFILES = [
    { id: 'standard', label: 'พนักงานประจำ (SSO + PND1)', sso: true, tax: 'progressive', icon: <IdentificationCard /> },
    { id: 'contract', label: 'จ้างเหมา/ฟรีแลนซ์ (หัก 3%)', sso: false, tax: 'flat3', icon: <Users /> },
    { id: 'none', label: 'ไม่หักภาษี (รับเต็ม)', sso: false, tax: 'none', icon: <CoinVertical /> }
];

export const usePayrollForm = (emp, onUpdate) => {
    // Config State
    const [config, setConfig] = useState({
        enableSSO: true,
        taxMode: 'progressive',
        profileId: 'custom'
    });

    // Local Form State
    const [form, setForm] = useState({
        salary: '', ot: '', incentive: '',
        deductions: '', sso: '', tax: '',
        customIncomes: [], customDeducts: []
    });

    const isEditing = useRef(false);

    // Calculation Logic
    const calculateTaxAndSSO = (currentForm, currentConfig) => {
        const salary = Number(currentForm.salary) || 0;
        const totalIncome = salary + (Number(currentForm.ot) || 0) + (Number(currentForm.incentive) || 0);

        let sso = 0;
        if (currentConfig.enableSSO) {
            sso = PayrollCalculator.calculateSSO(salary);
        }

        let tax = 0;
        if (currentConfig.taxMode === 'progressive') {
            tax = PayrollCalculator.calculateTax(totalIncome, sso);
        } else if (currentConfig.taxMode === 'flat3') {
            tax = totalIncome * 0.03;
        }

        return { sso, tax };
    };

    // Propagate Update to Parent
    const propagateUpdate = (updatedForm, updatedConfig) => {
        if (onUpdate) {
            onUpdate('financials', {
                salary: Number(updatedForm.salary),
                ot: Number(updatedForm.ot),
                incentive: Number(updatedForm.incentive),
                deductions: Number(updatedForm.deductions),
                sso: Number(updatedForm.sso),
                tax: Number(updatedForm.tax),
                _config: updatedConfig
            });
            onUpdate('customIncomes', updatedForm.customIncomes);
            onUpdate('customDeducts', updatedForm.customDeducts);
        }
    };

    // Initial Load & Sync Logic
    useEffect(() => {
        if (emp?.financials && !isEditing.current) {
            // 1. Construct Initial Form Locally
            const initialForm = {
                salary: String(emp.financials.salary || 0),
                ot: String(emp.financials.ot || 0),
                incentive: String(emp.financials.incentive || 0),
                deductions: String(emp.financials.deductions || 0),
                sso: String(emp.financials.sso || 0),
                tax: String(emp.financials.tax || 0),
                customIncomes: emp.customItems?.filter(i => i.type === 'income') || [],
                customDeducts: emp.customItems?.filter(i => i.type === 'deduct') || []
            };

            let targetConfig = null;

            // 2. Determine Config
            if (emp.financials._config) {
                targetConfig = emp.financials._config;
            } else if (emp.employeeSnapshot) {
                // Map from EmployeeForm (deductionProfile)
                const dbProfile = emp.employeeSnapshot.deductionProfile || 'none';

                if (dbProfile === 'sso_tax') {
                    targetConfig = { enableSSO: true, taxMode: 'progressive', profileId: 'standard' };
                } else if (dbProfile === 'tax') {
                    targetConfig = { enableSSO: false, taxMode: 'flat3', profileId: 'contract' };
                } else if (dbProfile === 'sso') {
                    targetConfig = { enableSSO: true, taxMode: 'none', profileId: 'custom' };
                } else {
                    targetConfig = { enableSSO: false, taxMode: 'none', profileId: 'none' };
                    // Force Zero for None profile
                    initialForm.sso = '0';
                    initialForm.tax = '0';
                }

                // 3. Recalculate Statutory based on Profile (if not custom loaded)
                if (targetConfig.profileId !== 'custom') {
                    const { sso, tax } = calculateTaxAndSSO(initialForm, targetConfig);
                    initialForm.sso = String(sso);
                    initialForm.tax = String(tax);
                }
            }

            // 4. Update State Once
            if (targetConfig) setConfig(targetConfig);
            setForm(initialForm);
        }
    }, [emp?.id, emp?.financials]);

    // Handlers
    const handleProfileChange = (profileId) => {
        const profile = DEDUCTION_PROFILES.find(p => p.id === profileId);
        if (!profile) return;

        const newConfig = {
            enableSSO: profile.sso,
            taxMode: profile.tax,
            profileId: profileId
        };
        setConfig(newConfig);

        const { sso, tax } = calculateTaxAndSSO(form, newConfig);
        const newForm = { ...form, sso: String(sso), tax: String(tax) };

        setForm(newForm);
        propagateUpdate(newForm, newConfig);
    };

    const handleInputChange = (field, value) => {
        isEditing.current = true;
        const tempForm = { ...form, [field]: value };

        if (['salary', 'ot', 'incentive'].includes(field)) {
            const { sso, tax } = calculateTaxAndSSO(tempForm, config);
            if (field === 'salary') tempForm.sso = String(sso);
            tempForm.tax = String(tax);
        }

        setForm(tempForm);
        propagateUpdate(tempForm, config);
        setTimeout(() => isEditing.current = false, 500);
    };

    const handleConfigChange = (key, value) => {
        const newConfig = { ...config, [key]: value };

        let matchProfile = 'custom';
        const checkSSO = key === 'enableSSO' ? value : config.enableSSO;
        const checkTax = key === 'taxMode' ? value : config.taxMode;

        if (checkSSO && checkTax === 'progressive') matchProfile = 'standard';
        else if (!checkSSO && checkTax === 'flat3') matchProfile = 'contract';
        else if (!checkSSO && checkTax === 'none') matchProfile = 'none';

        newConfig.profileId = matchProfile;
        setConfig(newConfig);

        const { sso, tax } = calculateTaxAndSSO(form, newConfig);
        const newForm = { ...form, sso: String(sso), tax: String(tax) };

        setForm(newForm);
        propagateUpdate(newForm, newConfig);
    };

    const resetToProfile = () => {
        if (emp.employeeSnapshot) {
            // Re-read from snapshot map
            const dbProfile = emp.employeeSnapshot.deductionProfile || 'none';
            let profileConfig = { enableSSO: false, taxMode: 'none', profileId: 'none' };

            if (dbProfile === 'sso_tax') {
                profileConfig = { enableSSO: true, taxMode: 'progressive', profileId: 'standard' };
            } else if (dbProfile === 'tax') {
                profileConfig = { enableSSO: false, taxMode: 'flat3', profileId: 'contract' };
            } else if (dbProfile === 'sso') {
                profileConfig = { enableSSO: true, taxMode: 'none', profileId: 'custom' };
            }

            setConfig(profileConfig);
            const { sso: newSSO, tax: newTax } = calculateTaxAndSSO(form, profileConfig);
            const newForm = { ...form, sso: String(newSSO), tax: String(newTax) };

            setForm(newForm);
            propagateUpdate(newForm, profileConfig);
        }
    };

    const addItem = (type) => {
        const newItem = { id: Date.now(), label: '', amount: 0, type };
        if (type === 'income') {
            const newIncome = [...form.customIncomes, newItem];
            setForm(prev => {
                const next = { ...prev, customIncomes: newIncome };
                propagateUpdate(next, config);
                return next;
            });
        } else {
            const newDeduct = [...form.customDeducts, newItem];
            setForm(prev => {
                const next = { ...prev, customDeducts: newDeduct };
                propagateUpdate(next, config);
                return next;
            });
        }
    };

    const removeItem = (type, idx) => {
        if (type === 'income') {
            const newIncome = form.customIncomes.filter((_, i) => i !== idx);
            setForm(prev => {
                const next = { ...prev, customIncomes: newIncome };
                propagateUpdate(next, config);
                return next;
            });
        } else {
            const newDeduct = form.customDeducts.filter((_, i) => i !== idx);
            setForm(prev => {
                const next = { ...prev, customDeducts: newDeduct };
                propagateUpdate(next, config);
                return next;
            });
        }
    };

    const customIncomeUpdate = (idx, field, value) => {
        const newItems = [...form.customIncomes];
        newItems[idx][field] = field === 'amount' ? Number(value) : value;

        setForm(prev => {
            const next = { ...prev, customIncomes: newItems };
            // Use updated form state simulation
            const simulatedForm = { ...next, customIncomes: newItems };
            propagateUpdate(simulatedForm, config);
            return next;
        });
    }

    const customDeductUpdate = (idx, field, value) => {
        const newItems = [...form.customDeducts];
        newItems[idx][field] = field === 'amount' ? Number(value) : value;

        setForm(prev => {
            const next = { ...prev, customDeducts: newItems };
            const simulatedForm = { ...next, customDeducts: newItems };
            propagateUpdate(simulatedForm, config);
            return next;
        });
    }

    const currentNet = useMemo(() => {
        let totalIncome = (Number(form.salary) || 0) + (Number(form.ot) || 0) + (Number(form.incentive) || 0);
        form.customIncomes.forEach(i => totalIncome += (i.amount || 0));

        let totalDeduct = (Number(form.deductions) || 0) + (Number(form.sso) || 0) + (Number(form.tax) || 0);
        form.customDeducts.forEach(d => totalDeduct += (d.amount || 0));

        return totalIncome - totalDeduct;
    }, [form]);

    const totalStatutory = (Number(form.sso) || 0) + (Number(form.tax) || 0);

    return {
        form, config, currentNet, totalStatutory,
        handleInputChange, handleConfigChange, handleProfileChange,
        addItem, removeItem, resetToProfile,
        customIncomeUpdate, customDeductUpdate
    };
};
