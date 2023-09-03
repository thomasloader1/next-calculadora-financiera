import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Expense } from '@/interfaces/Expense';
import { Button, Input, Select, SelectItem, Textarea } from '@nextui-org/react'
import React, { useState } from 'react'

const AddExpenseForm = () => {
    const { needs, wants, savings, updateNeeds, updateWants, updateSavings } = useExpenseContext();
    const [expense, setExpense] = useState<string>('');
    const [groupNames] = useState<string[]>(['Necesidad', 'Imprevistos', 'Ahorro']);
    const [expenseCategory, setExpenseCategory] = useState<string>('');
    const [expenseDescription, setExpenseDescription] = useState<string>('');

    const handleAddExpense = () => {
        const newExpense: Expense = { id: (Math.random() + Date.now()).toString(), description: `${expenseDescription}`, amount: +Number(expense) };

        switch (expenseCategory) {
            case 'Necesidad':
                const newStateNeeds: Expense[] = [...needs, newExpense]
                updateNeeds(newStateNeeds);
                break;
            case 'Ahorro':
                const newStateSavings: Expense[] = [...savings, newExpense];
                updateSavings(newStateSavings);
                break;
            default:
                const newStateWants: Expense[] = [...wants, newExpense];
                updateWants(newStateWants);
                break;
        }

        setExpense('');
        setExpenseCategory('');
        setExpenseDescription('');
    }

    return (
        <div className="grid grid-cols-1 gap-4 mt-3 bg-slate-200 px-3 py-2 rounded-lg animate-fade-down">
            <Input
                isClearable
                onClear={() => {
                    setExpense('')
                }}
                size='sm'
                type="number"
                label="Gasto"
                labelPlacement='outside'
                description={expense !== '' && `$ ${expense}`}
                value={expense}
                onValueChange={setExpense}
                placeholder='0.00'
                className='w-full'
                startContent={
                    <div className="pointer-events-none flex items-center">
                        <span className="text-default-400 text-small">$</span>
                    </div>
                }
            />

            <Select
                size='sm'
                labelPlacement='outside'
                label="Categoria"
                placeholder="Seleccione una categoria"
                description={`${expenseCategory}`}
                onChange={(e) => setExpenseCategory(e.target.value)}
            >
                {groupNames.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
            </Select>

            <Textarea
                className='w-full'
                onClear={() => {
                    setExpenseDescription('')
                }}
                size='sm'
                type="text"
                label="Descripcion del gasto"
                placeholder='Un panchito y una coca.'
                labelPlacement='outside'
                value={expenseDescription}
                onValueChange={setExpenseDescription}
            />

            <Button
                size='sm'
                className='w-full bg-black text-white hover:bg-warning-600 disabled:hover:bg-slate-400 disabled:bg-opacity-disabled disabled:cursor-not-allowed'
                isDisabled={expense === ''}
                onClick={handleAddExpense}
            >
                Agregar Gasto
            </Button>
        </div>
    )
}

export default AddExpenseForm