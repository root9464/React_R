import { Temporal } from '@js-temporal/polyfill';
import { useRouter } from '@tanstack/react-router';
import { Cell, toNano } from '@ton/core';
import { SendTransactionRequest, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import axios from 'axios';
import { Buffer } from 'buffer';
import { FC, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { getStatisticsValues } from '../api/getStatisticsValues';
import TonLogo from '../assets/ton.png';

interface IForm {
  value: number;
}

export const InputForm = () => {
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress();

  const router = useRouter();

  const [activeButton, setActiveButton] = useState(1);
  const initDataNow = Temporal.Now.zonedDateTimeISO('Europe/Moscow');
  const dateTimeNow = Temporal.ZonedDateTime.from(initDataNow);
  const formattedDateNow = `${dateTimeNow.day}.${dateTimeNow.month}.${dateTimeNow.year}::${dateTimeNow.hour}:${dateTimeNow.minute}:${dateTimeNow.second}`;

  const added30Days = initDataNow.add({ days: activeButton === 1 ? 1 : activeButton === 7 ? 9 : 40 });
  const dateTimePlus30Days = Temporal.ZonedDateTime.from(added30Days);
  const formattedDateEnd = `${dateTimePlus30Days.day}.${dateTimePlus30Days.month}.${dateTimePlus30Days.year}::${dateTimePlus30Days.hour}:${dateTimePlus30Days.minute}:${dateTimePlus30Days.second}`;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IForm>({
    mode: 'onChange',
  });
  const value = watch('value');

  const onSubmit: SubmitHandler<IForm> = async (data) => {
    const transaction: SendTransactionRequest = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [
        {
          address: import.meta.env.VITE_ADDRESS_WALLET,
          amount: toNano(data.value).toString(),
        },
      ],
    };
    const res = await tonConnectUI.sendTransaction(transaction);

    if (res) {
      const header = {
        hash: Cell.fromBoc(Buffer.from(res.boc, 'base64'))[0].hash().toString('hex'),
      };

      const body = {
        user_wallet_address: address,
        deposite_date: formattedDateNow,
        receiving_date: formattedDateEnd,
        amount: String(data.value),
        rewards: String(data.value * Math.pow(1 + activeButton / 100, 1)), // 1 day = amount + 1%
      };

      const json = {
        header: header,
        body: body,
      };

      console.log(JSON.stringify(json));

      const save = await axios.post(`https://earnton.ru/go/api/transaction`, json);
      if (save.status === 200) {
        router.navigate({
          to: '/profile',
        });
      }
    }
  };

  return (
    <div className='w-full h-max mt-4 bg-uiGrayGradient flex flex-col gap-3 rounded-32 px-5 py-4' onSubmit={handleSubmit(onSubmit)}>
      <h2 className='text-2xl font-climate'>Market Overview</h2>

      <div className='w-full h-8 px-2 py-1 flex flex-row gap-x-1 bg-uiLowGray rounded-32'>
        <ToggleButton label='1 day' isActive={activeButton === 1} onClick={() => setActiveButton(1)} />
        <ToggleButton label='7 day' isActive={activeButton === 7} onClick={() => setActiveButton(7)} />
        <ToggleButton label='30 day' isActive={activeButton === 30} onClick={() => setActiveButton(30)} />
      </div>

      <div className='w-full h-fit text-gray-400 flex flex-row justify-between text-xs'>
        <p>Assets</p>
        <p>Earnings for {activeButton} day</p>
      </div>

      <form className='w-full h-max px-4 py-5 flex flex-col gap-2 bg-uiLowGray rounded-32'>
        <HeaderForm activeButton={activeButton} value={value} />
        <div className='w-full h-fit flex flex-row items-center gap-3'>
          <input
            type='text'
            placeholder='+1'
            {...register('value', {
              required: true,
              min: 0.01,
              max: 8594,
            })}
            className={`w-[110px] bg-[#3F3F3F] rounded-[4px] border outline-none px-2 py-1 text-sm ${errors.value ? 'border-red-500' : 'border-[#818181]'}`}
          />
          <button type='submit' className='w-max bg-uiPurple text-white rounded-[4px] px-3 py-1 text-sm'>
            Buy
          </button>
        </div>
        <p className={`text-xs ${errors.value ? 'text-red-500' : 'text-gray-400'}`}>
          {errors.value ? 'Amount must be between 1 and 8594' : 'Min. 1 - Max. 8594'}
        </p>
      </form>
    </div>
  );
};

const HeaderForm: FC<{ activeButton: number; value: number }> = ({ activeButton, value }) => {
  const { data, isLoading, isSuccess } = getStatisticsValues();
  const percent: number = activeButton === 1 ? 1 : activeButton === 7 ? 9 : 40;
  const vals =
    data !== undefined && data !== null
      ? (() => {
          if (activeButton === 1) {
            return Array.isArray(data[2].total) ? (data[2].total[0] / 100).toFixed(2) : 'Invalid data';
          } else if (activeButton === 7) {
            return Array.isArray(data[2].total) && data[2].total.length > 1 ? (data[2].total[1] / 100).toFixed(2) : 'Invalid data';
          } else {
            return Array.isArray(data[2].total) && data[2].total.length > 2 ? (data[2].total[2] / 100).toFixed(2) : 'Invalid data';
          }
        })()
      : 'Invalid data';

  const calculatedValue = !isNaN(value) && !isNaN(percent) ? ((value * percent) / 100).toFixed(2) : '0.00';

  return (
    <div className='w-full h-full flex flex-row justify-between relative'>
      <div className='w-max h-full flex flex-row items-center gap-x-3'>
        <img src={TonLogo} alt='' className='w-5' />
        <h2>TON</h2>
      </div>
      <div className='w-max h-full flex flex-row items-center gap-x-3'>
        <p>{isLoading ? 'Loading...' : isSuccess && data ? vals : '0'}К</p>
        <p>+{activeButton === 1 ? 1 : activeButton === 7 ? 9 : 40}%</p>
      </div>
      {value === 0 || value === undefined || calculatedValue === '0.00' ? null : (
        <div className='w-max h-full flex flex-row items-center gap-x-3 border border-[#0FA958] rounded-md absolute right-0 top-8'>
          <p>{calculatedValue}</p>
        </div>
      )}
    </div>
  );
};

type ToggleButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
} & Partial<HTMLButtonElement>;

const ToggleButton: FC<ToggleButtonProps> = ({ label, isActive, onClick }) => (
  <button className={`w-1/3 h-full rounded-full ${isActive ? 'bg-black' : 'bg-[#3F3F3F]'}`} onClick={onClick}>
    {label}
  </button>
);
