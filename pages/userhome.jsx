'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '../components/Layout';
import NewcomerSetup from '../components/NewcomerSetup';
import '../style/userdashboard.css';
import Footer from '../components/footer';


export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [isNewcomer, setIsNewcomer] = useState(false);
  const [foodPlans, setFoodPlans] = useState([]);
  const [planMeals, setPlanMeals] = useState({});
  const [selectedPlans, setSelectedPlans] = useState({});
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [totalCalories, setTotalCalories] = useState(0);
  const [tdee, setTdee] = useState(null);
  const [totalFoodCalories, setTotalFoodCalories] = useState(0);
  const [totalExerciseCalories, setTotalExerciseCalories] = useState(0);
  const [dailyGoalCalories, setDailyGoalCalories] = useState(0);
  const [exerciseStarted, setExerciseStarted] = useState(false);
  const [recentComments, setRecentComments] = useState([]);
  const [exercisePlans, setExercisePlans] = useState([]);
  const [selectedExercisePlanId, setSelectedExercisePlanId] = useState(null);
  const [selectedExerciseDetails, setSelectedExerciseDetails] = useState([]);
  const [totalExerciseTime, setTotalExerciseTime] = useState(0); // total seconds
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseInProgress, setExerciseInProgress] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timerId, setTimerId] = useState(null);
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };
  const [timeUsed, setTimeUsed] = useState(0);
  const [currentLogId, setCurrentLogId] = useState(null);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [exerciseDone, setExerciseDone] = useState(false);
  const [currentExamplePic, setCurrentExamplePic] = useState('');

  const [mediaUrls, setMediaUrls] = useState({});

  const router = useRouter();
  const SUPABASE_MEDIA_BASE = 'https://shidmbowdyumxioxpabh.supabase.co/storage/v1/object/public/exercise/public/';

  const isVideo = (filename) => {
    if (!filename) return false;
    const ext = filename.split('.').pop().toLowerCase();
    return ['mp4', 'mov', 'webm'].includes(ext);
  };
  ;

  useEffect(() => {
    let timeUsedInterval;

    if (exerciseInProgress && !isPaused) {
      timeUsedInterval = setInterval(() => {
        setTimeUsed(prev => prev + 1);
      }, 1000);
    }

    return () => clearInterval(timeUsedInterval);
  }, [exerciseInProgress, isPaused]);


  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser || storedUser.role !== 'user') {
      router.push('/Login');
      return;
    }

    setUser(storedUser);

    const lastWorkoutKey = `lastWorkoutTime-${storedUser.member_ic}`;
    const lastWorkoutTime = localStorage.getItem(lastWorkoutKey);

    if (lastWorkoutTime) {
      const last = new Date(lastWorkoutTime);
      const now = new Date();

      // 4AM next day after workout
      const resetTime = new Date(last);
      resetTime.setDate(last.getDate() + 1);
      resetTime.setHours(4, 0, 0, 0);

      if (now < resetTime) {
        setExerciseDone(true); // ✅ Hide section
      } else {
        setExerciseDone(false); // ✅ Past 4AM, allow again
        localStorage.removeItem(lastWorkoutKey); // optional
      }
    }





    fetch(`/api/Db_connection?member_ic=${storedUser.member_ic}&role=user`)
      .then(res => res.json())
      .then(data => {
        if (!data.height || !data.weight) {
          setIsNewcomer(true);
        }
        if (data.tdee) {
          setTdee(data.tdee);
          const currentWeight = parseFloat(data.weight);
          const goalWeight = parseFloat(data.goal_weight);
          const weightDiff = goalWeight - currentWeight;

          const totalCalorieAdjustment = weightDiff * 7700; // 7700 kcal per kg
          const dailyAdjustment = totalCalorieAdjustment / 30;

          const goalCalories = Math.round(data.tdee + dailyAdjustment);
          setDailyGoalCalories(goalCalories > 0 ? goalCalories : 0);
        }

      })
      .catch(err => console.error('❌ Error checking profile:', err));
  }, [router]);
  useEffect(() => {
    const fetchExamplePic = async () => {
      const currentExercise = selectedExerciseDetails[currentExerciseIndex];
      if (!currentExercise || !currentExercise.exercise_id) return;

      try {
        const res = await fetch('/api/Db_connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'exercise',
            action: 'get_by_id',
            data: { exercise_id: currentExercise.exercise_id },
          }),
        });

        const result = await res.json();
        if (res.ok && result?.example_pic) {
          setCurrentExamplePic(result.example_pic);
        } else {
          setCurrentExamplePic('');
        }
      } catch (err) {
        console.error('Failed to fetch example_pic:', err);
        setCurrentExamplePic('');
      }
    };

    fetchExamplePic();
  }, [currentExerciseIndex]);


  // fetch exercise plan and details
  useEffect(() => {
    if (user) {
      fetch('/api/Db_connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'preset_workout_plan',
          action: 'get_user_plans',
          data: { member_ic: user.member_ic }
        })
      })
        .then(res => res.json())
        .then(plans => {
          setExercisePlans(plans || []);
          if (plans && plans.length > 0) {
            setSelectedExercisePlanId(plans[0].p_workoutplan_id); // ✅ Default to first plan
          }
        })
        .catch(err => console.error('❌ Failed to fetch exercise plans:', err));
    }
  }, [user]);

  useEffect(() => {
    if (selectedExercisePlanId) {
      fetch('/api/Db_connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'preset_workout_exercise',
          action: 'get_plan_exercises',
          data: { plan_id: selectedExercisePlanId }
        })
      })
        .then(res => res.json())
        .then(data => {
          setSelectedExerciseDetails(data || []);

          let totalSeconds = 0;
          for (const ex of data) {
            if (ex.reps && ex.set) {
              totalSeconds += ex.reps * ex.set * 5; // Assume 5 seconds per rep
            } else if (ex.duration_seconds) {
              totalSeconds += ex.duration_seconds;
            }
          }
          setTotalExerciseTime(totalSeconds);
        })

        .catch(err => console.error('❌ Failed to fetch exercise plan details:', err));
    }
  }, [selectedExercisePlanId]);


  useEffect(() => {
    if (user) {
      fetch('/api/Db_connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'diet_plan',
          action: 'get_user_plans',
          data: { member_ic: user.member_ic }
        })
      })
        .then(res => res.json())
        .then(async plans => {
          setFoodPlans(plans || []);

          if (plans && plans.length > 0) {
            setSelectedPlanId(plans[0].d_plan_id);
          }

          const mealsMap = {};

          for (const plan of plans) {
            const res = await fetch('/api/Db_connection', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                table: 'diet_plan_meal',
                action: 'get_plan_meals',
                data: { plan_id: plan.d_plan_id }
              })
            });

            const meals = await res.json();
            mealsMap[plan.d_plan_id] = meals;
          }

          setPlanMeals(mealsMap);
        })
        .catch(err => console.error('❌ Failed to fetch food plans:', err));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'comment',
          action: 'get_post_comments_by_user',
          data: { member_ic: user.member_ic }
        })
      })
        .then(res => res.json())
        .then(data => {
          console.log('✅ Recent comments data:', data); // 👈 Add this
          setRecentComments(data || []);
        })
        .catch(err => console.error('❌ Failed to fetch comment notifications:', err));
    }
  }, [user]);

  useEffect(() => {
    if (exerciseInProgress && countdown > 0 && !isPaused) {
      const id = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
      setTimerId(id);
      return () => clearInterval(id);
    }
  }, [countdown, exerciseInProgress, isPaused]);


  const handleExercisePlanSelect = async (planId) => {
    setSelectedExercisePlanId(planId);

    const res = await fetch('/api/Db_connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'preset_workout_exercise',
        action: 'get_plan_exercises',
        data: { plan_id: planId }
      })
    });

    const exercises = await res.json();
    setSelectedExerciseDetails(exercises || []);

    let totalSeconds = 0;
    for (const ex of exercises) {
      if (ex.reps && ex.set) {
        totalSeconds += ex.reps * ex.set * 5; // Assume 5 seconds per rep
      } else if (ex.duration_seconds) {
        totalSeconds += ex.duration_seconds;
      }
    }
    setTotalExerciseTime(totalSeconds);
  };



  const handleCheckboxChange = (key, calories) => {
    const newSelected = {
      ...selectedPlans,
      [key]: !selectedPlans[key],
    };
    setSelectedPlans(newSelected);

    const total = Object.entries(planMeals).reduce((acc, [pid, meals]) => {
      meals.forEach((meal) => {
        const k = `${pid}-${meal.meal_type}-${meal.food_name}`;
        if (newSelected[k]) {
          acc += meal.calories;
        }
      });
      return acc;
    }, 0);

    setTotalCalories(total);
  };

  const handleNextExercise = () => {
    const nextIndex = currentExerciseIndex + 1;
    if (nextIndex < selectedExerciseDetails.length) {
      const next = selectedExerciseDetails[nextIndex];
      setCurrentExerciseIndex(nextIndex);
      if (next.duration_seconds) {
        setCountdown(next.duration_seconds);
      } else {
        setCountdown(0);
      }
    } else {
      alert('✅ Workout complete!');
      setExerciseInProgress(false);
      setExerciseStarted(false);
      setExerciseDone(true);
      localStorage.setItem(`lastWorkoutTime-${user.member_ic}`, new Date().toISOString());



    }
  };


  const renderPlanDetails = (planId) => {
    const meals = planMeals[planId] || [];

    const groupedMeals = meals.reduce((acc, meal) => {
      acc[meal.meal_type] = acc[meal.meal_type] || [];
      acc[meal.meal_type].push(meal);
      return acc;
    }, {});

    return (
      <div style={{ marginBottom: '20px' }}>
        {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((mealType) => {
          const foods = groupedMeals[mealType];
          if (!foods) return null; // Skip if the meal type doesn't exist

          return (
            <div key={mealType} style={{ marginTop: '8px' }}>
              <div style={{ paddingBottom: '4px', borderBottom: '1px solid #ccc' }}>
                <strong>{mealType}</strong>
              </div>
              <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
                {foods.map((food) => {
                  const foodKey = `${selectedPlanId}-${mealType}-${food.food_name}`;
                  const isChecked = !!selectedPlans[foodKey];
                  return (
                    <li key={foodKey}>
                      <label>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxChange(foodKey, food.calories)}
                          style={{ marginRight: '8px' }}
                        />
                        {food.food_name} – {food.serving_size}g – {food.calories} kcal
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    );

  };

  if (!user) return <p>Loading...</p>;
  if (isNewcomer) {
    return <NewcomerSetup user={user} setUser={setUser} setIsNewcomer={setIsNewcomer} />;
  }

  return (
    <Layout>

      <div className="dashboard-container" style={{
        display: 'flex', gap: '0', minHeight: exerciseInProgress ? '80vh' : '50vh', marginTop: exerciseInProgress ? '180px' : '180px'

      }}>
        {exerciseStarted ? (
          <div style={{ textAlign: 'center' }} className="exercise-inprogress">

            <div className="exercise-inprogress-menu">
              {selectedExercisePlanId && (
                <>

                  {!exerciseInProgress && (
                    <>

                      <h2> Exercise Mode Started</h2>

                      <h3 >
                        Plan: {exercisePlans.find(p => p.p_workoutplan_id === selectedExercisePlanId)?.plan_name}
                      </h3>


                      <ul style={{ marginTop: '1px', textAlign: 'left', display: 'inline-block' }}>
                        {selectedExerciseDetails.map((ex, index) => (
                          <li key={index}>
                            {ex.exercise_name} –{' '}
                            {ex.reps && ex.set
                              ? `${ex.reps} reps × ${ex.set} sets`
                              : `${ex.duration_seconds} seconds`} – 🔥 {ex.estimated_calories} kcal
                          </li>
                        ))}
                      </ul>

                      <p style={{ marginTop: '10px' }}>
                        🕒 Time needed:{' '}
                        <strong>
                          {Math.floor(totalExerciseTime / 60)} min {totalExerciseTime % 60} sec
                        </strong>
                      </p>



                    </>
                  )}
                </>
              )}
            </div>


            {exerciseInProgress ? (
              <div>

                <h2 >
                  Plan: {exercisePlans.find(p => p.p_workoutplan_id === selectedExercisePlanId)?.plan_name}
                </h2>

                <p style={{ marginTop: '10px', fontWeight: 'bold' }}>
                  🕒 Time used: {Math.floor(timeUsed / 60)}m {timeUsed % 60}s
                </p>
                {currentExamplePic && (
                  isVideo(currentExamplePic) ? (
                    <video
                      src={SUPABASE_MEDIA_BASE + currentExamplePic}
                      controls
                      autoPlay
                      loop
                      muted
                      className="dashboard-exercise-video"
                    />
                  ) : (
                    <img
                      src={SUPABASE_MEDIA_BASE + currentExamplePic}
                      alt="Exercise"
                      className="dashboard-exercise-img"
                    />
                  )
                )}



                <h2><strong>{selectedExerciseDetails[currentExerciseIndex]?.exercise_name}</strong></h2>


                <h3 style={{ fontSize: '18px', marginTop: '10px' }}>
                  {selectedExerciseDetails[currentExerciseIndex]?.reps && selectedExerciseDetails[currentExerciseIndex]?.set
                    ? `${selectedExerciseDetails[currentExerciseIndex].reps} reps × ${selectedExerciseDetails[currentExerciseIndex].set} sets`
                    : `⏱ Time left: ${Math.floor(countdown / 60)}m ${countdown % 60}s`
                  }
                </h3>


                <div style={{ marginTop: '20px' }}>
                  <button onClick={togglePause} style={{ marginRight: 10, padding: '10px 20px' }}>
                    {isPaused ? '▶ Resume' : '⏸ Pause'}
                  </button>

                  <button onClick={handleNextExercise} style={{ marginRight: 10, padding: '10px 20px' }}>
                    ⏭ Next Exercise
                  </button>


                  <br />
                  <button
                    onClick={() => {
                      setExerciseInProgress(false);
                      setExerciseStarted(false);
                      setCurrentExerciseIndex(0);
                      setCountdown(0);
                      setTimeUsed(0); // ⏱️ Reset again
                      clearInterval(timerId);
                    }}

                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px'
                    }}
                  >
                    ⏹ Stop
                  </button>
                </div>
              </div>
            ) : (


              <div style={{ marginTop: '20px' }} className="exercise-inprogress-menu-btn-container">
                <button
                  className="exercise-inprogress-menu-btn"
                  onClick={async () => {
                    const first = selectedExerciseDetails[0];
                    if (first.duration_seconds) {
                      setCountdown(first.duration_seconds);
                    }

                    // Step 1: Add or get existing log
                    const logResponse = await fetch('/api/Db_connection', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        table: 'workout_log',
                        action: 'update_or_extend_log',
                        data: {
                          member_ic: user.member_ic,
                          p_workoutplan_id: selectedExercisePlanId,
                          new_duration: timeUsed,
                          new_calories: selectedExerciseDetails.reduce((sum, ex) => sum + (ex.estimated_calories || 0), 0),
                          exercises: selectedExerciseDetails.map(ex => ({
                            exercise_id: ex.exercise_id,
                            sets_completed: ex.set || 0,
                            reps_per_set: ex.reps ? `${ex.reps}` : '',
                            weight_per_set: '',
                            duration_seconds: ex.duration_seconds || (ex.reps && ex.set ? ex.reps * ex.set * 5 : 0),
                            calories_burned: ex.estimated_calories || 0
                          }))
                        }
                      })
                    });



                    const logData = await logResponse.json();
                    const logId = logData?.log?.log_id;
                    setCurrentLogId(logId); // ✅ Store it


                    // Step 2: Insert exercises under the log
                    if (logId) {
                      const exercisesToInsert = selectedExerciseDetails.map(ex => ({
                        exercise_id: ex.exercise_id,
                        sets_completed: ex.set || 0,
                        reps_per_set: ex.reps ? `${ex.reps}` : '',
                        weight_per_set: '', // optional
                        duration_seconds: ex.duration_seconds || (ex.reps && ex.set ? ex.reps * ex.set * 5 : 0),
                        calories_burned: ex.estimated_calories || 0
                      }));

                      await fetch('/api/Db_connection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          table: 'workout_log_exercise',
                          action: 'insert_exercises',
                          data: {
                            log_id: logId,
                            exercises: exercisesToInsert,
                            day: new Date().getDate()
                          }
                        })
                      });
                    }

                    // Step 3: Start the exercise
                    setExerciseInProgress(true);
                    setCurrentExerciseIndex(0);

                    setTimeUsed(0);
                  }}

                  style={{
                    marginRight: '10px',
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  ▶ Start Now
                </button>





                <button
                  className="exercise-inprogress-menu-btn"
                  onClick={() => setExerciseStarted(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  ⏹ Stop Exercise
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex' }}>
            {/* 🥗 Food Plans – Left */}
            <div className='FoodPlans' style={{ flex: 1, borderRight: '1px solid #ccc' }}>
              <h2>Food Plans</h2>

              {foodPlans.length === 0 ? (
                <p>You haven’t had a food plan. Let’s add one now!</p>
              ) : foodPlans.length === 1 ? (
                <div>
                  <h4>{foodPlans[0].plan_name}</h4>
                  {renderPlanDetails(foodPlans[0].d_plan_id)}
                  <button
                    onClick={() => router.push('/customizeplan')}
                    className='Dashboard-btn'
                  >
                    Customize Plan
                  </button>
                </div>
              ) : (
                <>
                  <label><strong>Select a food plan:</strong></label>
                  <select
                    value={selectedPlanId || ''}
                    onChange={(e) => {
                      setSelectedPlanId(Number(e.target.value));
                      setSelectedPlans({}); // ⬅️ Clear all selected checkboxes
                      setTotalCalories(0);  // ⬅️ Reset total food calories if needed
                    }}

                    style={{ display: 'block', margin: '10px 0', padding: '5px' }}
                  >
                    <option value="" disabled>Select plan</option>
                    {foodPlans.map(plan => (
                      <option key={plan.d_plan_id} value={plan.d_plan_id}>
                        {plan.plan_name}
                      </option>
                    ))}
                  </select>

                  {selectedPlanId && renderPlanDetails(selectedPlanId)}
                  <button
                    onClick={() => router.push('/customizeplan')}
                    className='Dashboard-btn'
                  >
                    Customize Plan
                  </button>
                </>
              )}
            </div>

            {/* 🧩 Middle – Summary */}
            <div className="middle-container" style={{ borderRight: '1px solid #ccc' }}>
              <div className="middle-DailySummary">
                <h2>Daily Summary</h2>
                <p>Consumed from food: <strong style={{ color: '#50da00' }}>{totalCalories} </strong>kcal.</p>
                <p> burned through exercise.<strong  >{totalExerciseCalories}  </strong> kcal </p>
                <p> Today goal's is to stay within <strong>{dailyGoalCalories} kcal</strong></p>

                <p>
                  {totalFoodCalories - totalExerciseCalories > dailyGoalCalories
                    ? ' You’re over your calorie goal today. Try adjusting your intake or activity.'
                    : '✅ You’re on track with your calorie goal. Keep it up!'}
                </p>

              </div>

              {/* 🏋️ Exercise Plan Section (conditionally shown) */}
              <div >
                {!exerciseDone ? (
                  <>
                    <h2>Your Exercise Plan</h2>
                    {exercisePlans.length === 0 ? (
                      <div>
                        <p>You don’t have any exercise plan yet.</p>
                        <button
                          onClick={() => router.push('/customizeplan')}
                          className='Dashboard-btn'
                          style={{marginTop:'10px'}}
                        >
                          Customize Plan Now!
                        </button>
                      </div>
                    ) : (
                      <>
                        {exercisePlans.length > 1 ? (
                          <select
                            value={selectedExercisePlanId || ''}
                            onChange={(e) => setSelectedExercisePlanId(Number(e.target.value))}
                            style={{ padding: '6px', marginBottom: '10px' }}
                          >
                            <option value="" disabled>Select your exercise plan</option>
                            {exercisePlans.map(plan => (
                              <option key={plan.p_workoutplan_id} value={plan.p_workoutplan_id}>
                                {plan.plan_name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <h4>{exercisePlans[0]?.plan_name}</h4>
                        )}

                        {selectedExerciseDetails.length > 0 && (
                          <div
                            className="custom-scroll"
                            style={{
                              marginTop: '10px',
                              marginBottom: '60px',
                              textAlign: 'left',
                              maxHeight: selectedExerciseDetails.length > 4 ? '160px' : 'auto',
                              overflowY: selectedExerciseDetails.length > 4 ? 'auto' : 'visible',
                              paddingRight: '5px', // for scrollbar space
                            }}
                          >
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                              {selectedExerciseDetails.map((exercise, index) => (
                                <li key={index}>
                                  {exercise.exercise_name} –{' '}
                                  {exercise.reps && exercise.set
                                    ? `${exercise.reps} reps × ${exercise.set} sets`
                                    : `${exercise.duration_seconds} seconds`}
                                  {' '}–  {exercise.estimated_calories} kcal
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <button
                          onClick={() => setExerciseStarted(true)}
                          className='Dashboard-btn-start'
                        >
                          ▶ Start Exercise
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="WorkoutCompleted" style={{ padding: '10px', backgroundColor: '#e6ffed', borderRadius: '6px', marginTop: '10px', color: 'black' }}>
                    <h3>✅ Workout Completed!</h3>
                    <p>Great job! You’ve finished your exercise for today.</p>

                  </div>
                )}
              </div>

            </div>




            {/* 🔔 Notifications – Right */}
            {/* 🔔 Notifications – Right */}
            <div className='Notification' style={{ flex: 1, paddingLeft: '20px' }}>
              <h2>🔔 Notifications</h2>

              {Array.isArray(recentComments) ? (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {recentComments.length === 0 ? (
                    <li>No one has commented on your posts yet.</li>
                  ) : (
                    recentComments.map((comment, index) => (
                      <li key={index} style={{ marginBottom: '12px' }}>
                        💬 <strong>{comment.commenter_name}</strong> Comment under your post: "{comment.content}"<br />
                        <small style={{ color: '#888' }}>
                          {new Date(comment.created_at).toLocaleString()}
                        </small>
                      </li>
                    ))
                  )}
                </ul>
              ) : (
                <p style={{ color: 'red' }}>⚠️ Failed to load comments</p>
              )}

              <button
                onClick={() => router.push('/community')}
                className='Dashboard-btn'
              >
                Explore Now
              </button>
            </div>

          </div>
        )}
      </div>
      <Footer />
    </Layout>

  );

}
