import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import { Expense } from '@/interfaces/Expense';
import { Button, Input, Select, SelectItem, Textarea } from '@nextui-org/react'
import React, { useState } from 'react'
import Swal from 'sweetalert2/dist/sweetalert2.js'

interface Category {
    cash: number | undefined;
    update: (expenses: Expense[]) => void;
    expenses: Expense[];
}

const AddExpenseForm = () => {
    const { needs, wants, savings, cash, updateNeeds, updateWants, updateSavings } = useExpenseContext();
    const [expense, setExpense] = useState<string>('');
    const [groupNames] = useState<{name: string}[]>([{name:'Necesidad'}, {name:'Imprevistos'}, {name:'Ahorro'}]);
    const [expenseCategory, setExpenseCategory] = useState<string>('');
    const [expenseDescription, setExpenseDescription] = useState<string>('');

    const handleAddExpense = () => {
        const newExpense: Expense = { 
            id: (Math.random() + Date.now()).toString(), 
            description: expenseDescription !== "" ? `${expenseDescription}` : "Un panchito y una coca", 
            amount: +Number(expense) 
        };

        const categories: Record<string,Category> = {
            'Necesidad': { cash: cash?.needs, update: updateNeeds, expenses: needs },
            'Ahorro': { cash: cash?.savings, update: updateSavings, expenses: savings },
            'Imprevistos': { cash: cash?.wants, update: updateWants, expenses: wants }
        };
    
        const category = categories[expenseCategory];
        if(!category){
            Swal.fire({
                title: '¡No tan rapido!',
                text: 'Seleccione una categoria',
                icon: 'error',
                confirmButtonText: 'Entendido'
              })
        }
    
        if ((Number(category.cash) - Number(expense)) >= 0) {
            const newState: Expense[] = [...category.expenses, newExpense];
            category.update(newState);
        } else {
            Swal.fire({
                title: '¡Oops, algo no cuadra!',
                text: 'El monto ingresado supera el limite de la categoria!',
                icon: 'error',
                confirmButtonText: 'Ententido'
              })
        }

        setExpense('');
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
                min={0}
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
                items={groupNames}
                labelPlacement='outside'
                label="Categoria"
                placeholder="Seleccione una categoria"
                value={''}
                onChange={(e) => setExpenseCategory(e.target.value)}
            >
                {(c) => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>}
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