import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Chip, Divider } from '@nextui-org/react';
import { formatAmount } from '@/lib/formatAmount';
import { ExpenseListProps } from '@/interfaces/Expense';

const ExpenseList: React.FC<ExpenseListProps> = ({ category, expenses, cash }) => {
  const [cashAmount, setCashAmount] = useState(cash)
  const chipColor = category.includes("Ahorro") ? 'success' : category.includes('Necesidad') ? 'primary' : 'warning'
  const squreText = category.includes("Ahorro") ? 20 : category.includes('Necesidad') ? 50 : 30

  const squarePops ={color: chipColor, text: squreText}

  useEffect(() => {
    expenses.map(expense => {
      setCashAmount(prevState =>  Number(prevState) - expense.amount )
    })
  
  }, [expenses])
  

  return (
    <Card className='justify-center'>
    <CardHeader className="grid grid-cols-[48px_1fr] gap-2 items-center">
      <div className={`bg-${squarePops.color} text-white font-bold rounded-lg w-12 h-12 flex items-center justify-center`}>
        <span>{squarePops.text}%</span>
      </div>
      <div className="flex justify-between w-full">
        <h2 className="text-lg font-semibold">{category}</h2>
        <Chip color={chipColor} variant="flat">{formatAmount(cashAmount)}</Chip>
      </div>
    </CardHeader>
    <Divider/>
      <CardBody>
      {expenses.map((expense) => (
                <Chip key={expense.id}
                  onClose={() => console.log(expense.id)} color={chipColor} variant="flat"
                >
                  {formatAmount(expense.amount)} - {expense.description}
                </Chip>
            ))}
      </CardBody>
  </Card>
  );
  
};

export default ExpenseList;
