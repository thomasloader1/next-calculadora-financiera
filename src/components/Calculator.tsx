'use client'
import React, { useState } from 'react';
import ExpenseList from './ExpenseList';
import { Button } from '@nextui-org/button';
import { Input } from "@nextui-org/react";
import AddExpenseForm from './AddExpenseForm';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import useFirebaseAuth from '@/hooks/useFirebaseAuth';
import { formatAmount } from '@/lib/formatAmount';

const Calculator: React.FC = () => {
    const { needs, wants, savings, cash, updateCash } = useExpenseContext();
    const [amount, setAmount] = useState<string>('');
    const user = useFirebaseAuth();

    const handleCalculate = () => {
        updateCash({
            needs: 0.5 * Number(amount),
            wants: 0.3 * Number(amount),
            savings: 0.2 * Number(amount),
        })
    }

    return (
        <section className={`max-w-4xl mx-auto mt-8 p-4 grid animate-fade-down ${cash ? 'grid-cols-2' : 'grid-cols-1'}  gap-5`}>
            <article className='mb-3 '>
            <h1 className="text-2xl font-semibold mb-4">Expense Calculator</h1>
            <p className='text-sm mb-5'>Hola, {user?.displayName}</p>
                <div className="flex items-stretch w-full flex-wrap md:flex-nowrap gap-4 bg-slate-200 px-3 py-2 rounded-lg">
                    <Input
                        isClearable
                        onClear={() => {
                            setAmount('')
                            updateCash(null)
                        }}
                        size='lg'
                        type="number"
                        label="Monto en mano"
                        labelPlacement='outside'
                        description={amount !== '' && `${formatAmount(amount)}`}
                        value={amount}
                        onValueChange={setAmount}
                        placeholder='0.00'
                        readOnly={cash != null}
                        startContent={
                            <div className="pointer-events-none flex items-center">
                                <span className="text-default-400 text-small">$</span>
                            </div>
                        }
                    />

                    {(cash === null) && (
                        <Button size='sm' className='h-100 bg-black text-white hover:bg-slate-800 animate-fade-down' onClick={handleCalculate}>Cargar</Button>
                    )}
                </div>

                {cash && <AddExpenseForm /> }

            </article>
            {cash &&
            <article className="grid grid-cols-1 gap-4 animate-fade-left">
                <ExpenseList category="Necesidad" expenses={needs} cash={cash?.needs} />
                <ExpenseList category="Imprevistos" expenses={wants} cash={cash?.wants} />
                <ExpenseList category="Ahorro" expenses={savings} cash={cash?.savings} />
            </article>
            }
        </section>
    );
};

export default Calculator;
