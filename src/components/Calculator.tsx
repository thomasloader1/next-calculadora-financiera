'use client'
import React, { useState } from 'react';
import ExpenseList from './ExpenseList';
import { Button } from '@nextui-org/button';
import { Input } from "@nextui-org/react";
import AddExpenseForm from './AddExpenseForm';
import { useExpenseContext } from '@/context/Expense/ExpenseContext';
import useFirebaseAuth from '@/hooks/useFirebaseAuth';
import { formatAmount } from '@/lib/formatAmount';
import {FaGithub, FaGlobe, FaLinkedinIn} from 'react-icons/fa'

const Calculator: React.FC = () => {
    const { needs, wants, savings, cash, updateCash } = useExpenseContext();
    const [amount, setAmount] = useState<string>('');
   // const user = useFirebaseAuth();

    const handleCalculate = () => {
        updateCash({
            needs: 0.5 * Number(amount),
            wants: 0.3 * Number(amount),
            savings: 0.2 * Number(amount),
        })
    }

    return (
        <section className={`w-auto p-4 grid animate-fade-down gap-5 ${cash ? 'gird-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            <article className='mb-3 '>
{/*             <p className='text-sm mb-5'>Hola, {user?.displayName}</p> */}
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
                        <Button size='sm' className='h-100 bg-black text-white hover:bg-slate-800 animate-fade-down px-4 py-3 w-full md:w-auto disabled:hover:bg-slate-400 disabled:bg-opacity-disabled disabled:cursor-not-allowed' onClick={handleCalculate} isDisabled={amount === ''}>Cargar</Button>
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
            <div className="text-center text-sm text-gray-500">
                Hecho con ❤️ por Gomez Tomas Gonzalo
                <div className="mt-3 flex justify-center space-x-2">
                    <a href="https://github.com/thomasloader1" target="_blank" rel="noopener noreferrer">
                        <FaGithub size={24} />
                    </a>
                    <a href="https://linkedin.com/in/gomeztomasgonzalo" target="_blank" rel="noopener noreferrer">
                        <FaLinkedinIn size={24} />
                    </a>
                    <a href="https://gomeztomasgonzalo.com.ar" target="_blank" rel="noopener noreferrer" >
                        <FaGlobe size={24}  />
                    </a>
                </div>
                <div className='flex flex-col items-center mt-3'>

                <span className='mb-2'>Si te gustó la app o te sirvio</span>
                <a href='https://cafecito.app/thomasloader1' rel='noopener' target='_blank'>
                    <img srcSet='https://cdn.cafecito.app/imgs/buttons/button_5.png 1x, https://cdn.cafecito.app/imgs/buttons/button_5_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png 3.75x' src='https://cdn.cafecito.app/imgs/buttons/button_5.png' alt='Invítame un café en cafecito.app' />
                    </a>
                </div>
            </div>
        </section>
    );
};

export default Calculator;
