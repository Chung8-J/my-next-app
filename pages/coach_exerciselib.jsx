'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ExerciseLibrary from '@/components/ExerciseLibrary';


export default function CoachExercisesPage() {
  const router = useRouter();
  const [role, setRole] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      router.push('/Login');
    } else {
      setRole('admin');
    }
  }, []);

  if (!role) return null;

  return <ExerciseLibrary role={role} />;
}
