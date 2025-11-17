
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = '/api';
    let allExercises = [];
    let currentSessionId = null;
    let USER_ID = null;
    let globalSettings = { defaultRestTime: 90 };
    let createRoutineExerciseList = [];
    let mainTimerInterval = null;
    let mainTimerSeconds = 0;
    let liveStats = { volume: 0, sets: 0 };
    let exerciseSetCounters = {};
    let activeRestTimer = { interval: null, element: null, seconds: 0 };
    const tabWorkout = document.getElementById('tab-workout');
    const tabRoutines = document.getElementById('tab-routines');
    const tabHistory = document.getElementById('tab-history');
    const tabProgress = document.getElementById('tab-progress');
    const tabSettings = document.getElementById('tab-settings');
    const pageWorkout = document.getElementById('page-workout');
    const pageRoutines = document.getElementById('page-routines');
    const pageHistory = document.getElementById('page-history');
    const pageProgress = document.getElementById('page-progress');
    const pageSettings = document.getElementById('page-settings');

    const startWorkoutContainer = document.getElementById('start-workout-container');
    const newWorkoutNameInput = document.getElementById('new-workout-name');
    const startEmptyWorkoutBtn = document.getElementById('start-empty-workout-btn');
    const startRoutineList = document.getElementById('start-routine-list');
    const workoutArea = document.getElementById('workout-area');
    const workoutTitleInput = document.getElementById('workout-title-input');
    const exerciseListDiv = document.getElementById('exercise-list');
    const addExerciseBtn = document.getElementById('add-exercise-btn');
    const finishWorkoutBtn = document.getElementById('finish-workout-btn');
    const liveTimerDisplay = document.getElementById('live-timer');
    const liveVolumeDisplay = document.getElementById('live-volume');
    const liveSetsDisplay = document.getElementById('live-sets');
    const routinesListContainer = document.getElementById('routines-list-container');
    const createRoutineBtn = document.getElementById('create-routine-btn');
    const historyListContainer = document.getElementById('history-list-container');
    const progressSearchInput = document.getElementById('progress-search-input');
    const progressSearchResults = document.getElementById('progress-search-results'); 
    const progressChartContainer = document.getElementById('progress-chart-container');
    const userIdDisplay = document.getElementById('user-id-display');
    const welcomeBanner = document.getElementById('welcome-banner');

    const defaultRestTimeInput = document.getElementById('default-rest-time');
    const saveSettingsBtn = document.getElementById('save-settings-btn');

    const addExerciseModal = document.getElementById('add-exercise-modal');
    const closeAddExerciseModalBtn = document.getElementById('close-add-exercise-modal-btn');
    const modalExerciseList = document.getElementById('modal-exercise-list');
    const searchExerciseInput = document.getElementById('search-exercise-input');
    const createExerciseFromSearchBtn = document.getElementById('create-exercise-from-search-btn');
    
    const createRoutineModal = document.getElementById('create-routine-modal');
    const closeCreateRoutineModalBtn = document.getElementById('close-create-routine-modal-btn');
    const newRoutineNameInput = document.getElementById('new-routine-name-input');
    const searchRoutineExerciseInput = document.getElementById('search-routine-exercise-input');
    const routineExerciseSearchList = document.getElementById('routine-exercise-search-list');
    const routineExerciseSelectedList = document.getElementById('routine-exercise-selected-list');
    const saveRoutineBtn = document.getElementById('save-routine-btn');
    
    const createExerciseModal = document.getElementById('create-exercise-modal');
    const closeCreateExerciseModalBtn = document.getElementById('close-create-exercise-modal-btn');
    const newExerciseNameInput = document.getElementById('new-exercise-name-input'); 
    const newExerciseCategorySelect = document.getElementById('new-exercise-category-select');
    const saveExerciseBtn = document.getElementById('save-exercise-btn'); 

    const modalBackdrop = document.getElementById('modal-backdrop');

    function loadSettings() {
        const savedSettings = localStorage.getItem('fitStatsSettings');
        if (savedSettings) {
            globalSettings = JSON.parse(savedSettings);
        }
        defaultRestTimeInput.value = globalSettings.defaultRestTime;
    }

    function saveSettings() {
        globalSettings.defaultRestTime = parseInt(defaultRestTimeInput.value) || 90;
        localStorage.setItem('fitStatsSettings', JSON.stringify(globalSettings));
        alert('Settings saved!');
    }

    function getOrSetUserId() {
        let userId = localStorage.getItem('fitStatsUserId');
        if (!userId) {
            userId = crypto.randomUUID();
            localStorage.setItem('fitStatsUserId', userId);
        }
        USER_ID = userId;
        userIdDisplay.textContent = USER_ID.split('-')[0];
    }

    async function secureFetch(url, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'X-User-ID': USER_ID,
            ...options.headers,
        };
        if (options.body) {
            options.body = JSON.stringify(options.body);
        }
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
        }
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            return { success: true };
        }
    }
    async function loadAllExercises() {
        try {
            allExercises = await secureFetch(`${API_BASE_URL}/exercises`);
            populateExerciseModal(allExercises);
            populateProgressSearch(allExercises); 
        } catch (error) { console.error('Error fetching exercises:', error); }
    }

    async function loadRoutines() {
        try {
            const routines = await secureFetch(`${API_BASE_URL}/routines`);
            renderRoutinesList(routines);
            renderStartRoutineList(routines);
        } catch (error) { console.error('Error fetching routines:', error); }
    }

    async function loadHistory() {
        historyListContainer.innerHTML = '<p>Loading history...</p>';
        try {
            const history = await secureFetch(`${API_BASE_URL}/history`);
            renderHistoryList(history);
        } catch (error) {
            console.error('Error fetching history:', error);
            historyListContainer.innerHTML = `<p>Error loading history: ${error.message}</p>`;
        }
    }

    async function getAndDrawChart(exerciseId) {
        progressChartContainer.innerHTML = '<p>Loading chart data...</p>';
        try {
            const data = await secureFetch(`${API_BASE_URL}/progress-chart/${exerciseId}`);
            renderProgressChart(data);
        } catch (error) {
            console.error('Error fetching chart data:', error);
            progressChartContainer.innerHTML = `<p>Error loading chart: ${error.message}</p>`;
        }
    }
    function renderRoutinesList(routines) {
        routinesListContainer.innerHTML = '';
        if (routines.length === 0) {
            routinesListContainer.innerHTML = '<p>You haven\'t created any routines yet.</p>';
            return;
        }
        routines.forEach(routine => {
            const item = document.createElement('div');
            item.className = 'routine-item';
            item.innerHTML = `
                <div class="routine-item-details">
                    <h3>${routine.routine_name}</h3>
                    <span>${routine.exercise_count} exercises</span>
                </div>
                <div class="routine-item-actions">
                    <button class="button-primary start-routine-btn" data-routine-id="${routine.routine_id}" data-routine-name="${routine.routine_name}">Start</button>
                    <button class="button-danger delete-routine-btn" data-routine-id="${routine.routine_id}" data-routine-name="${routine.routine_name}">
                        <i class="ph-bold ph-trash"></i>
                    </button>
                </div>
            `;
            routinesListContainer.appendChild(item);
        });
    }

    function renderStartRoutineList(routines) {
        startRoutineList.innerHTML = '';
        if (routines.length === 0) {
            startRoutineList.innerHTML = '<p>Create a routine on the "Routines" page to start from it!</p>';
            return;
        }
        routines.forEach(routine => {
            const item = document.createElement('button');
            item.className = 'button-secondary start-routine-btn';
            item.textContent = routine.routine_name;
            item.dataset.routineId = routine.routine_id;
            item.dataset.routineName = routine.routine_name;
            startRoutineList.appendChild(item);
        });
    }

    function renderHistoryList(history) {
        if (history.length === 0) {
            historyListContainer.innerHTML = '<p>No workout history found. Go log a workout!</p>';
            return;
        }
        historyListContainer.innerHTML = '';
        history.forEach(session => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const date = new Date(session.session_date).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            item.innerHTML = `
                <h3>${session.session_title || 'Workout'}</h3>
                <div class="history-item-date">${date}</div>
                <div class="history-item-summary"><strong>${session.total_sets || 0}</strong> total sets</div>
                <div class="history-item-summary"><strong>Exercises:</strong> ${session.exercises_done || 'N/A'}</div>
            `;
            historyListContainer.appendChild(item);
        });
    }
    
    function renderProgressChart(data) {
        if (data.length === 0 || !data.dates || data.dates.length === 0) {
            progressChartContainer.innerHTML = '<p>No data found for this exercise. Go log some sets!</p>';
            return;
        }
        progressChartContainer.innerHTML = '';
        const trace = {
            x: data.dates, y: data.weights,
            mode: 'lines+markers', type: 'scatter', name: 'Heaviest Weight',
            line: { shape: 'hv', color: 'var(--color-primary)', width: 3 },
            marker: { color: 'var(--color-primary)', size: 8 }
        };
        const layout = {
            title: 'Heaviest Weight Lifted',
            xaxis: { title: 'Date', gridcolor: 'transparent', zeroline: false, tickformat: '%b %d', },
            yaxis: { title: 'Heaviest Weight (kg)', gridcolor: 'var(--color-border)', zeroline: false, ticksuffix: ' kg' },
            plot_bgcolor: 'var(--color-bg-secondary)',
            paper_bgcolor: 'var(--color-bg-secondary)',
            font: { color: 'var(--color-text)' },
            margin: { l: 60, r: 20, b: 50, t: 50 }
        };
        Plotly.newPlot('progress-chart-container', [trace], layout, {responsive: true});
    }

    function populateExerciseModal(exercises) {
        modalExerciseList.innerHTML = '';
        exercises.forEach(exercise => {
            const item = document.createElement('div');
            item.className = 'modal-list-item';
            item.textContent = exercise.exercise_name; 
            item.dataset.exerciseId = exercise.exercise_id;
            item.addEventListener('click', () => {
                addExerciseToWorkout(exercise.exercise_id, exercise.exercise_name);
                closeModal();
            });
            modalExerciseList.appendChild(item);
        });
    }

    
    function populateProgressSearch(exercises) {
        progressSearchResults.innerHTML = '';
        exercises.forEach(exercise => {
            const item = document.createElement('div');
            item.className = 'modal-list-item'; 
            item.textContent = exercise.exercise_name;
            item.dataset.exerciseId = exercise.exercise_id;
            
            item.addEventListener('click', () => {
                progressSearchInput.value = exercise.exercise_name;
                progressSearchResults.classList.add('hidden');
                getAndDrawChart(exercise.exercise_id);
            });
            progressSearchResults.appendChild(item);
        });
    }


    async function startWorkout(title, routineId = null) {
        try {
            const result = await secureFetch(`${API_BASE_URL}/start-workout`, {
                method: 'POST',
                body: { title: title || 'New Workout' }
            });
            currentSessionId = result.session_id;
            startWorkoutContainer.classList.add('hidden');
            workoutArea.classList.remove('hidden');
            exerciseListDiv.innerHTML = '';
            workoutTitleInput.value = title || 'New Workout';
            liveStats = { volume: 0, sets: 0 };
            updateLiveStatsDisplay();
            exerciseSetCounters = {};
            startMainTimer();

            if (routineId) {
                const routine = await secureFetch(`${API_BASE_URL}/routines/${routineId}`);
                for (const ex of routine.exercises) {
                    await addExerciseToWorkout(ex.exercise_id, ex.exercise_name);
                }
            }
        } catch (error) {
            console.error('Error starting workout:', error);
            alert(`Error starting new workout: ${error.message}`);
        }
    }
    
    async function addExerciseToWorkout(exerciseId, exerciseName) {
        if (document.querySelector(`.exercise-log[data-exercise-id="${exerciseId}"]`)) {
            alert("This exercise is already in your workout.");
            return;
        }
        const prevSet = await secureFetch(`${API_BASE_URL}/exercise-log/previous?exercise_id=${exerciseId}`);
        const prevSetText = prevSet ? `${prevSet.weight_kg} kg x ${prevSet.reps} reps` : 'No previous sets';

        const exerciseLogDiv = document.createElement('div');
        exerciseLogDiv.className = 'exercise-log';
        exerciseLogDiv.dataset.exerciseId = exerciseId;
        exerciseLogDiv.innerHTML = `
            <div class="exercise-log-header">
                <h3>${exerciseName}</h3>
                <span class="previous-set-info">Prev: ${prevSetText}</span>
            </div>
            <div class="inline-timer-wrapper"></div>
            <div class="sets-list-header">
                <span>Set</span>
                <span>Previous</span>
                <span>kg</span>
                <span>Reps</span>
                <span></span>
            </div>
            <div class="sets-list"></div>
            <button class="add-set-btn"><i class="ph-bold ph-plus"></i> Add Set</button>
        `;
        exerciseListDiv.appendChild(exerciseLogDiv);
        exerciseSetCounters[exerciseId] = 0;
        addSetRow(exerciseLogDiv, exerciseId, prevSet);

        exerciseLogDiv.querySelector('.add-set-btn').addEventListener('click', () => {
            addSetRow(exerciseLogDiv, exerciseId, prevSet);
        });
    }

    function addSetRow(exerciseLogDiv, exerciseId, prevSet) {
        exerciseSetCounters[exerciseId]++;
        const setNumber = exerciseSetCounters[exerciseId];
        const setRow = document.createElement('div');
        setRow.className = 'set-row';
        setRow.innerHTML = `
            <span class="set-number">${setNumber}</span>
            <span class="set-input set-previous">${prevSet ? `${prevSet.weight_kg} x ${prevSet.reps}` : '-'}</span>
            <input type="number" class="set-input input-kg" placeholder="0">
            <input type="number" class="set-input input-reps" placeholder="0">
            <div class="set-check"><i class="ph-bold ph-check"></i></div>
        `;
        exerciseLogDiv.querySelector('.sets-list').appendChild(setRow);
        setRow.querySelector('.set-check').addEventListener('click', (e) => {
            handleSetCheck(e, exerciseId, setNumber, exerciseLogDiv);
        });
    }

    async function handleSetCheck(event, exerciseId, setNumber, exerciseLogDiv) {
        const checkBtn = event.currentTarget;
        if (checkBtn.classList.contains('checked')) return;
        const setRow = checkBtn.closest('.set-row');
        const kgInput = setRow.querySelector('.input-kg');
        const repsInput = setRow.querySelector('.input-reps');
        const weight_kg = parseFloat(kgInput.value) || 0;
        const reps = parseInt(repsInput.value) || 0;

        try {
            await handleLogSet(exerciseId, setNumber, weight_kg, reps);
            checkBtn.classList.add('checked');
            setRow.classList.add('logged');
            kgInput.disabled = true;
            repsInput.disabled = true;
            liveStats.sets++;
            liveStats.volume += (weight_kg * reps);
            updateLiveStatsDisplay();
            startInlineRestTimer(exerciseLogDiv);
        } catch (error) {
            console.error('Failed to log set:', error);
            alert(`Failed to save set: ${error.message}`);
        }
    }
    
    async function handleLogSet(exerciseId, set_number, weight_kg, reps) {
        if (!currentSessionId) {
            throw new Error('No active workout session. Please restart.');
        }
        const setData = {
            session_id: currentSessionId, exercise_id: exerciseId,
            set_number: set_number, weight_kg: weight_kg, reps: reps
        };
        try {
            await secureFetch(`${API_BASE_URL}/log-set`, {
                method: 'POST', body: setData
            });
            console.log('Set logged successfully');
        } catch (error) {
            console.error('Error logging set:', error);
            throw error; 
        }
    }
    
    function updateLiveStatsDisplay() {
        liveVolumeDisplay.textContent = `${liveStats.volume} kg`;
        liveSetsDisplay.textContent = liveStats.sets;
    }

    function startMainTimer() {
        if (mainTimerInterval) clearInterval(mainTimerInterval);
        mainTimerSeconds = 0;
        liveTimerDisplay.textContent = '00:00';
        mainTimerInterval = setInterval(() => {
            mainTimerSeconds++;
            const minutes = Math.floor(mainTimerSeconds / 60);
            const seconds = mainTimerSeconds % 60;
            liveTimerDisplay.textContent = 
                `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }
    function stopMainTimer() {
        if (mainTimerInterval) clearInterval(mainTimerInterval);
        mainTimerInterval = null;
    }
    function startInlineRestTimer(exerciseLogDiv) {
        removeActiveRestTimer(); 
        let seconds = globalSettings.defaultRestTime;
        const timerWrapper = exerciseLogDiv.querySelector('.inline-timer-wrapper');
        timerWrapper.innerHTML = `
            <div class="inline-rest-timer">
                <span class="inline-timer-display">${formatRestTime(seconds)}</span>
                <div class="inline-timer-actions">
                    <button class="timer-add-15">+15s</button>
                    <button class="timer-skip">Skip</button>
                </div>
            </div>
        `;
        const display = timerWrapper.querySelector('.inline-timer-display');
        activeRestTimer.element = timerWrapper;
        activeRestTimer.interval = setInterval(() => {
            seconds--;
            display.textContent = formatRestTime(seconds);
            if (seconds <= 0) {
                removeActiveRestTimer();
                playBeep();
            }
        }, 1000);
        timerWrapper.querySelector('.timer-add-15').addEventListener('click', () => {
            seconds += 15;
            display.textContent = formatRestTime(seconds);
        });
        timerWrapper.querySelector('.timer-skip').addEventListener('click', () => {
            removeActiveRestTimer();
        });
    }
    function removeActiveRestTimer() {
        if (activeRestTimer.interval) {
            clearInterval(activeRestTimer.interval);
            activeRestTimer.interval = null;
        }
        if (activeRestTimer.element) {
            activeRestTimer.element.innerHTML = '';
            activeRestTimer.element = null;
        }
    }
    function formatRestTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    function playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) { console.warn("Could not play beep:", e); }
    }
    
    function renderRoutineBuilderSearch(exercises) {
        routineExerciseSearchList.innerHTML = '';
        exercises.forEach(ex => {
            if (createRoutineExerciseList.find(r => r.id === ex.exercise_id)) return;
            const item = document.createElement('div');
            item.className = 'modal-list-item';
            item.textContent = ex.exercise_name;
            item.addEventListener('click', () => {
                createRoutineExerciseList.push({ id: ex.exercise_id, name: ex.exercise_name });
                renderRoutineBuilderSelectedList();
                const query = searchRoutineExerciseInput.value.toLowerCase();
                const filtered = allExercises.filter(ex => ex.exercise_name.toLowerCase().includes(query));
                renderRoutineBuilderSearch(filtered);
            });
            routineExerciseSearchList.appendChild(item);
        });
    }
    function renderRoutineBuilderSelectedList() {
        routineExerciseSelectedList.innerHTML = '';
        createRoutineExerciseList.forEach((ex, index) => {
            const pill = document.createElement('div');
            pill.className = 'exercise-pill';
            pill.textContent = ex.name;
            const removeBtn = document.createElement('span');
            removeBtn.className = 'exercise-pill-remove';
            removeBtn.innerHTML = '&times;';
            removeBtn.addEventListener('click', () => {
                createRoutineExerciseList.splice(index, 1);
                renderRoutineBuilderSelectedList();
                const query = searchRoutineExerciseInput.value.toLowerCase();
                const filtered = allExercises.filter(ex => ex.exercise_name.toLowerCase().includes(query));
                renderRoutineBuilderSearch(filtered);
            });
            pill.appendChild(removeBtn);
            routineExerciseSelectedList.appendChild(pill);
        });
    }
    async function handleSaveRoutine() {
        const routineName = newRoutineNameInput.value;
        if (!routineName) return alert('Please enter a name for your routine.');
        if (createRoutineExerciseList.length === 0) return alert('Please add at least one exercise.');
        const routineData = {
            routine_name: routineName,
            exercise_ids: createRoutineExerciseList.map(ex => ex.id)
        };
        try {
            await secureFetch(`${API_BASE_URL}/routines`, { method: 'POST', body: routineData });
            closeModal();
            loadRoutines();
            switchTab(tabRoutines, pageRoutines);
        } catch (error) {
            console.error('Error saving routine:', error);
            alert(`Error saving routine: ${error.message}`);
        }
    }
    
    function openModal(modalElement) {
        modalElement.classList.remove('hidden');
        modalBackdrop.classList.remove('hidden');
    }
    function closeModal() {
        [addExerciseModal, createRoutineModal, createExerciseModal].forEach(m => m.classList.add('hidden'));
        modalBackdrop.classList.add('hidden');
    }

    function switchTab(activeTab, activePage) {
        [tabWorkout, tabRoutines, tabHistory, tabProgress, tabSettings].forEach(t => t.classList.remove('active'));
        [pageWorkout, pageRoutines, pageHistory, pageProgress, pageSettings].forEach(p => {
            p.classList.remove('active');
            p.classList.add('hidden');
        });
        activeTab.classList.add('active');
        activePage.classList.add('active');
        activePage.classList.remove('hidden');
        
        if (activePage === pageHistory) loadHistory();
        if (activePage === pageRoutines) loadRoutines();
        if (activePage === pageSettings) {
            welcomeBanner.classList.add('hidden');
        } else {
            welcomeBanner.classList.remove('hidden');
        }
    }
    tabWorkout.addEventListener('click', () => switchTab(tabWorkout, pageWorkout));
    tabRoutines.addEventListener('click', () => switchTab(tabRoutines, pageRoutines));
    tabHistory.addEventListener('click', () => switchTab(tabHistory, pageHistory));
    tabProgress.addEventListener('click', () => switchTab(tabProgress, pageProgress));
    tabSettings.addEventListener('click', () => switchTab(tabSettings, pageSettings));

  
    startEmptyWorkoutBtn.addEventListener('click', () => {
        const title = newWorkoutNameInput.value || 'New Workout';
        startWorkout(title, null);
    });
    startRoutineList.addEventListener('click', (e) => {
        const btn = e.target.closest('.start-routine-btn');
        if (btn) {
            startWorkout(btn.dataset.routineName, btn.dataset.routineId);
        }
    });
    finishWorkoutBtn.addEventListener('click', () => {
        startWorkoutContainer.classList.remove('hidden');
        workoutArea.classList.add('hidden');
        currentSessionId = null;
        stopMainTimer();
        removeActiveRestTimer();
        newWorkoutNameInput.value = '';
    });

    createRoutineBtn.addEventListener('click', () => {
        createRoutineExerciseList = [];
        newRoutineNameInput.value = '';
        renderRoutineBuilderSelectedList();
        renderRoutineBuilderSearch(allExercises);
        openModal(createRoutineModal);
    });
    routinesListContainer.addEventListener('click', async (e) => {
        const startBtn = e.target.closest('.start-routine-btn');
        const deleteBtn = e.target.closest('.delete-routine-btn');
        if (startBtn) {
            switchTab(tabWorkout, pageWorkout);
            startWorkout(startBtn.dataset.routineName, startBtn.dataset.routineId);
            return;
        }
        if (deleteBtn) {
            const routineId = deleteBtn.dataset.routineId;
            const routineName = deleteBtn.dataset.routineName;
            const isConfirmed = confirm(`Are you sure you want to delete "${routineName}"?`);
            if (isConfirmed) {
                try {
                    await secureFetch(`${API_BASE_URL}/routines/${routineId}`, { method: 'DELETE' });
                    loadRoutines(); 
                } catch (error) { alert(`Error: ${error.message}`); }
            }
        }
    });

    addExerciseBtn.addEventListener('click', () => {
        searchExerciseInput.value = '';
        populateExerciseModal(allExercises);
        openModal(addExerciseModal);
    });
    closeAddExerciseModalBtn.addEventListener('click', closeModal);
    searchExerciseInput.addEventListener('keyup', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allExercises.filter(ex => ex.exercise_name.toLowerCase().includes(query));
        populateExerciseModal(filtered);

        if (filtered.length === 0 && query.length > 0) {
            createExerciseFromSearchBtn.textContent = `Create "${query}"`;
            createExerciseFromSearchBtn.classList.remove('hidden');
        } else {
            createExerciseFromSearchBtn.classList.add('hidden');
        }
    });
    createExerciseFromSearchBtn.addEventListener('click', () => {
        const newName = searchExerciseInput.value;
        newExerciseNameInput.value = newName; 
        newExerciseCategorySelect.value = 'Custom';
        closeModal();
        openModal(createExerciseModal);
    });

    closeCreateRoutineModalBtn.addEventListener('click', closeModal);
    searchRoutineExerciseInput.addEventListener('keyup', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allExercises.filter(ex => ex.exercise_name.toLowerCase().includes(query));
        renderRoutineBuilderSearch(filtered);
    });
    saveRoutineBtn.addEventListener('click', handleSaveRoutine);

   
    closeCreateExerciseModalBtn.addEventListener('click', closeModal);
    saveExerciseBtn.addEventListener('click', async () => {
        const exerciseName = newExerciseNameInput.value;
        const category = newExerciseCategorySelect.value;
        if (!exerciseName) return alert('Please enter an exercise name.');
        
        try {
            const newExercise = await secureFetch(`${API_BASE_URL}/exercises`, {
                method: 'POST',
                body: { exercise_name: exerciseName, category: category }
            });
            
            allExercises.push(newExercise);
            
            allExercises.sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));
            
            populateProgressSearch(allExercises);
            
            addExerciseToWorkout(newExercise.exercise_id, newExercise.exercise_name);
            closeModal();
            
        } catch (error) {
            console.error('Error creating exercise:', error);
            alert(`Error: ${error.message}`);
        }
    });
    modalBackdrop.addEventListener('click', closeModal);

    progressSearchInput.addEventListener('keyup', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length > 0) {
            const filtered = allExercises.filter(ex => ex.exercise_name.toLowerCase().includes(query));
            populateProgressSearch(filtered);
            progressSearchResults.classList.remove('hidden');
        } else {
            progressSearchResults.classList.add('hidden');
        }
    });
    progressSearchInput.addEventListener('focus', () => {
        if(progressSearchInput.value.length > 0) {
            progressSearchResults.classList.remove('hidden');
        }
    });
    document.addEventListener('click', (e) => {
        if (!pageProgress.contains(e.target)) {
            progressSearchResults.classList.add('hidden');
        }
    });
    
    saveSettingsBtn.addEventListener('click', saveSettings);
    loadSettings();
    getOrSetUserId();
    loadAllExercises();
    loadRoutines();
    
});