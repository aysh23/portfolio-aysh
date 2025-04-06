// Data storage setup
const STORAGE_KEY = 'mindful_entries';
const GOALS_STORAGE_KEY = 'mindful_goals';
const ACHIEVEMENTS_STORAGE_KEY = 'mindful_achievements';
const STREAK_STORAGE_KEY = 'mindful_streak';

// Initialize additional features
document.addEventListener('DOMContentLoaded', () => {
  // Add this to your existing DOMContentLoaded function
  displayGoals();
  setupGoalForm();
  checkAndUpdateStreak();
  displayAchievements();
  setupPdfExport();
  
  // Set today's date as the minimum for goal end dates
  const goalEndDateInput = document.getElementById('goal-end-date');
  if (goalEndDateInput) {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    goalEndDateInput.setAttribute('min', formattedDate);
    
    // Set default end date to one week from today
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    goalEndDateInput.value = nextWeek.toISOString().split('T')[0];
  }
});

// Setup Goal Form
function setupGoalForm() {
  const goalForm = document.getElementById('goal-form');
  if (goalForm) {
    goalForm.addEventListener('submit', createNewGoal);
  }
}

// Create a new goal
function createNewGoal(e) {
  e.preventDefault();
  
  const title = document.getElementById('goal-title').value;
  const category = document.getElementById('goal-category').value;
  const target = parseInt(document.getElementById('goal-target').value);
  const period = document.getElementById('goal-period').value;
  const endDate = document.getElementById('goal-end-date').value;
  
  if (!title || !category || !target || !endDate) {
    showNotification('Please fill in all fields', 'error');
    return;
  }
  
  const goal = {
    id: Date.now(),
    title,
    category,
    target,
    period,
    endDate,
    progress: 0,
    created: new Date().toISOString(),
    completed: false
  };
  
  // Get existing goals
  const goals = getGoals();
  
  // Add new goal
  goals.push(goal);
  
  // Save to local storage
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  
  // Reset form
  document.getElementById('goal-title').value = '';
  document.getElementById('goal-category').selectedIndex = 0;
  
  // Show success message
  showNotification('New goal created!', 'success');
  
  // Update goals display
  displayGoals();
  
  // Check if achievement unlocked
  checkAchievements();
}

// Get goals from local storage
function getGoals() {
  const goals = localStorage.getItem(GOALS_STORAGE_KEY);
  return goals ? JSON.parse(goals) : [];
}

// Display active and completed goals
function displayGoals() {
  const activeGoalsList = document.getElementById('active-goals-list');
  const completedGoalsList = document.getElementById('completed-goals-list');
  
  if (!activeGoalsList || !completedGoalsList) return;
  
  const goals = getGoals();
  
  // Filter active and completed goals
  const activeGoals = goals.filter(goal => !goal.completed);
  const completedGoals = goals.filter(goal => goal.completed);
  
  // Display active goals
  if (activeGoals.length === 0) {
    activeGoalsList.innerHTML = '<p class="empty-state">No active goals. Create one below!</p>';
  } else {
    let activeGoalsHTML = '';
    activeGoals.forEach(goal => {
      const progressPercentage = Math.min(Math.round((goal.progress / goal.target) * 100), 100);
      const periodText = goal.period === 'day' ? 'daily' : goal.period + 'ly';
      const isNearlyComplete = progressPercentage >= 100;
      
      activeGoalsHTML += `
        <div class="goal-card" data-id="${goal.id}">
          <div class="goal-header">
            <span class="goal-title">${goal.title}</span>
            <span class="goal-category">${goal.category}</span>
          </div>
          <div class="goal-details">
            <p>Target: ${goal.progress}/${goal.target} times ${periodText}</p>
            <p>Ends: ${formatDate(goal.endDate)}</p>
          </div>
          <div class="goal-progress">
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${progressPercentage}%"></div>
            </div>
            <span class="progress-text">${progressPercentage}% complete</span>
          </div>
          <div class="goal-actions">
            <button class="goal-btn increment" data-id="${goal.id}">+ Progress</button>
            ${isNearlyComplete ? `<button class="goal-btn complete" data-id="${goal.id}">Mark Complete</button>` : ''}
            <button class="goal-btn delete" data-id="${goal.id}">Delete</button>
          </div>
        </div>
      `;
    });
    
    activeGoalsList.innerHTML = activeGoalsHTML;
    
    // Add event listeners
    document.querySelectorAll('.goal-btn.increment').forEach(btn => {
      btn.addEventListener('click', incrementGoalProgress);
    });
    
    document.querySelectorAll('.goal-btn.complete').forEach(btn => {
      btn.addEventListener('click', completeGoal);
    });
    
    document.querySelectorAll('.goal-btn.delete').forEach(btn => {
      btn.addEventListener('click', deleteGoal);
    });
  }
  
  // Display completed goals
  if (completedGoals.length === 0) {
    completedGoalsList.innerHTML = '<p class="empty-state">No completed goals yet.</p>';
  } else {
    let completedGoalsHTML = '';
    completedGoals.slice(-5).reverse().forEach(goal => { // Show last 5 completed goals
      completedGoalsHTML += `
        <div class="goal-card completed" data-id="${goal.id}">
          <div class="goal-header">
            <span class="goal-title">${goal.title}</span>
            <span class="goal-category">${goal.category}</span>
          </div>
          <div class="goal-details">
            <p>Completed on: ${formatDate(new Date(goal.completedDate).toISOString().split('T')[0])}</p>
          </div>
          <div class="goal-actions">
            <button class="goal-btn delete" data-id="${goal.id}">Remove</button>
          </div>
        </div>
      `;
    });
    
    completedGoalsList.innerHTML = completedGoalsHTML;
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.goal-card.completed .goal-btn.delete').forEach(btn => {
      btn.addEventListener('click', deleteGoal);
    });
  }
}

// Increment goal progress
function incrementGoalProgress() {
  const goalId = this.getAttribute('data-id');
  const goals = getGoals();
  
  const goalIndex = goals.findIndex(goal => goal.id == goalId);
  if (goalIndex !== -1) {
    goals[goalIndex].progress += 1;
    
    // Check if goal is completed
    if (goals[goalIndex].progress >= goals[goalIndex].target) {
      showNotification('Goal target reached! 🎉', 'success');
    }
    
    // Save updated goals
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    
    // Update display
    displayGoals();
    
    // Check for achievements
    checkAchievements();
  }
}

// Mark goal as complete
function completeGoal() {
  const goalId = this.getAttribute('data-id');
  const goals = getGoals();
  
  const goalIndex = goals.findIndex(goal => goal.id == goalId);
  if (goalIndex !== -1) {
    goals[goalIndex].completed = true;
    goals[goalIndex].completedDate = new Date().toISOString();
    
    // Save updated goals
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
    
    // Show success message
    showNotification('Goal completed! 🎉', 'success');
    
    // Update display
    displayGoals();
    
    // Check for achievements
    checkAchievements();
  }
}

// Delete goal
function deleteGoal() {
  const goalId = this.getAttribute('data-id');
  const goals = getGoals();
  
  const updatedGoals = goals.filter(goal => goal.id != goalId);
  
  // Save updated goals
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updatedGoals));
  
  // Show notification
  showNotification('Goal removed', 'info');
  
  // Update display
  displayGoals();
}

// Format date for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Check and update daily streak
function checkAndUpdateStreak() {
  let streak = JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY)) || {
    count: 0,
    lastCheck: null
  };
  
  const today = new Date().toDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toDateString();
  
  // If already checked in today, do nothing
  if (streak.lastCheck === today) {
    return;
  }
  
  // If checked in yesterday, increment streak
  if (streak.lastCheck === yesterdayString) {
    streak.count++;
    streak.lastCheck = today;
    showNotification(`Streak: ${streak.count} days! 🔥`, 'success');
  } 
  // If missed a day, reset streak
  else if (streak.lastCheck !== null && streak.lastCheck !== today) {
    streak.count = 1;  // Start new streak
    streak.lastCheck = today;
    showNotification('New streak started!', 'info');
  } 
  // First time ever
  else if (streak.lastCheck === null) {
    streak.count = 1;
    streak.lastCheck = today;
    showNotification('First day of your streak! 🔥', 'success');
  }
  
  // Save updated streak
  localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(streak));
  
  // Update streak display
  updateStreakDisplay(streak);
  
  // Check for achievements
  checkAchievements();
}

// Update streak display
function updateStreakDisplay(streak) {
  const trackerSection = document.getElementById('tracker');
  if (trackerSection) {
    // Check if streak display already exists
    let streakContainer = document.querySelector('.streak-container');
    
    if (!streakContainer) {
      // Create streak container
      streakContainer = document.createElement('div');
      streakContainer.className = 'streak-container';
      trackerSection.querySelector('.container').appendChild(streakContainer);
    }
    
    // Update streak content
    streakContainer.innerHTML = `
      <div class="streak-count">
        <span>${streak.count}</span>
        <span class="streak-flame">🔥</span>
      </div>
      <div class="streak-message">
        ${streak.count > 1 ? `You've tracked your mood for ${streak.count} days in a row!` : 'First day of tracking!'}
      </div>
    `;
  }
}

// Define available achievements
const ACHIEVEMENTS = [
  {
    id: 'first_entry',
    title: 'First Steps',
    description: 'Create your first journal entry',
    icon: '📝',
    condition: (data) => data.entries.length >= 1
  },
  {
    id: 'week_streak',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '🔥',
    condition: (data) => data.streak.count >= 7
  },
  {
    id: 'month_streak',
    title: 'Consistency King',
    description: 'Maintain a 30-day streak',
    icon: '👑',
    condition: (data) => data.streak.count >= 30
  },
  {
    id: 'first_goal',
    title: 'Goal Setter',
    description: 'Create your first wellness goal',
    icon: '🎯',
    condition: (data) => data.goals.length >= 1
  },
  {
    id: 'complete_goal',
    title: 'Goal Crusher',
    description: 'Complete a wellness goal',
    icon: '🏆',
    condition: (data) => data.goals.filter(g => g.completed).length >= 1
  },
  {
    id: 'three_goals',
    title: 'Triple Threat',
    description: 'Complete three wellness goals',
    icon: '🌟',
    condition: (data) => data.goals.filter(g => g.completed).length >= 3
  },
  {
    id: 'activity_variety',
    title: 'Well-Rounded',
    description: 'Try all different types of activities',
    icon: '🎭',
    condition: (data) => {
      const activityTypes = new Set();
      data.entries.forEach(entry => {
        entry.activities.forEach(activity => activityTypes.add(activity));
      });
      return activityTypes.size >= 6;
    }
  },
  {
    id: 'happy_week',
    title: 'Joy Seeker',
    description: 'Have a full week of happy entries',
    icon: '😊',
    condition: (data) => {
      if (data.entries.length < 7) return false;
      
      const lastWeekEntries = data.entries.slice(-7);
      return lastWeekEntries.every(entry => entry.mood === 'happy');
    }
  }
];

// Check achievements
function checkAchievements() {
  // Get current data
  const entries = getEntries();
  const goals = getGoals();
  const streak = JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY)) || { count: 0 };
  
  // Get existing unlocked achievements
  let unlockedAchievements = JSON.parse(localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY)) || [];
  
  // Prepare data for achievement checks
  const data = {
    entries,
    goals,
    streak
  };
  
  // Check each achievement
  let newlyUnlocked = false;
  
  ACHIEVEMENTS.forEach(achievement => {
    // Skip if already unlocked
    if (unlockedAchievements.find(a => a.id === achievement.id)) {
      return;
    }
    
    // Check if condition is met
    if (achievement.condition(data)) {
      // Unlock this achievement
      unlockedAchievements.push({
        id: achievement.id,
        unlockedDate: new Date().toISOString()
      });
      
      newlyUnlocked = true;
      
      // Show notification
      showNotification(`Achievement Unlocked: ${achievement.title}! 🏆`, 'success');
    }
  });
  
  // Save updated achievements if there are changes
  if (newlyUnlocked) {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(unlockedAchievements));
    displayAchievements();
  }
}

// Display achievements
function displayAchievements() {
  const achievementsContainer = document.getElementById('achievements-container');
  if (!achievementsContainer) return;
  
  // Get unlocked achievements
  const unlockedAchievements = JSON.parse(localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY)) || [];
  
  let achievementsHTML = '';
  
  // Create HTML for each achievement
  ACHIEVEMENTS.forEach(achievement => {
    const isUnlocked = unlockedAchievements.some(a => a.id === achievement.id);
    
    achievementsHTML += `
      <div class="achievement ${isUnlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${achievement.icon}</div>
        <div class="achievement-title">${achievement.title}</div>
        <div class="achievement-description">${achievement.description}</div>
      </div>
    `;
  });
  
  achievementsContainer.innerHTML = achievementsHTML;
}

// Setup PDF Export
function setupPdfExport() {
  const exportPdfButton = document.getElementById('export-pdf');
  if (exportPdfButton) {
    exportPdfButton.addEventListener('click', generateInsightsPDF);
  }
}

// Generate PDF with insights
function generateInsightsPDF() {
  // Use jsPDF library if available
  if (typeof jspdf === 'undefined') {
    // If jsPDF is not loaded, dynamically load it
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = function() {
      // Also load html2canvas
      const canvasScript = document.createElement('script');
      canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      canvasScript.onload = actuallyGeneratePDF;
      document.body.appendChild(canvasScript);
    };
    document.body.appendChild(script);
    showNotification('Preparing PDF export...', 'info');
  } else {
    actuallyGeneratePDF();
  }
}

// Actually generate the PDF once libraries are loaded
function actuallyGeneratePDF() {
  showNotification('Generating PDF report...', 'info');
  
  // Create a temporary div to render our report in
  const reportContainer = document.createElement('div');
  reportContainer.className = 'pdf-report-container';
  reportContainer.style.padding = '20px';
  reportContainer.style.background = 'white';
  reportContainer.style.fontFamily = 'Arial, sans-serif';
  reportContainer.style.width = '650px';
  reportContainer.style.position = 'absolute';
  reportContainer.style.left = '-9999px';
  
  document.body.appendChild(reportContainer);
  
  // Get data
  const entries = getEntries();
  const goals = getGoals();
  const activeGoals = goals.filter(goal => !goal.completed);
  const completedGoals = goals.filter(goal => goal.completed);
  
  // Calculate mood percentages
  const moodCounts = {
    happy: 0,
    neutral: 0,
    sad: 0
  };
  
  entries.forEach(entry => {
    moodCounts[entry.mood]++;
  });
  
  const totalEntries = entries.length;
  const moodPercentages = {
    happy: totalEntries ? Math.round((moodCounts.happy / totalEntries) * 100) : 0,
    neutral: totalEntries ? Math.round((moodCounts.neutral / totalEntries) * 100) : 0,
    sad: totalEntries ? Math.round((moodCounts.sad / totalEntries) * 100) : 0
  };
  
  // Calculate most common activities
  const activityCounts = {};
  entries.forEach(entry => {
    entry.activities.forEach(activity => {
      activityCounts[activity] = (activityCounts[activity] || 0) + 1;
    });
  });
  
  const topActivities = Object.keys(activityCounts)
    .map(name => ({ name, count: activityCounts[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // Generate report HTML
  let reportHTML = `
    <h1 style="color: #7BA1CD; text-align: center; margin-bottom: 20px;">Mindful: Your Insights Report</h1>
    <p style="text-align: center; color: #6E7785;">Generated on ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</p>
    
  <div style="margin-top: 30px; border-bottom: 1px solid #DDD; padding-bottom: 20px;">
      <h2 style="color: #7BA1CD;">Mood Overview</h2>
      <p>Total journal entries: ${totalEntries}</p>
      <p>Your mood distribution:</p>
      <ul>
        <li>Happy: ${moodPercentages.happy}%</li>
        <li>Neutral: ${moodPercentages.neutral}%</li>
        <li>Sad: ${moodPercentages.sad}%</li>
      </ul>
    </div>
    
    <div style="margin-top: 20px; border-bottom: 1px solid #DDD; padding-bottom: 20px;">
      <h2 style="color: #7BA1CD;">Top Activities</h2>
      ${topActivities.length > 0 ? 
        `<p>Your most common activities:</p>
        <ul>
          ${topActivities.map(activity => 
            `<li>${activity.name}: ${activity.count} times</li>`
          ).join('')}
        </ul>` : 
        `<p>No activities recorded yet.</p>`
      }
    </div>
    
    <div style="margin-top: 20px; border-bottom: 1px solid #DDD; padding-bottom: 20px;">
      <h2 style="color: #7BA1CD;">Goals Summary</h2>
      <p>Active goals: ${activeGoals.length}</p>
      <p>Completed goals: ${completedGoals.length}</p>
      
      ${activeGoals.length > 0 ? 
        `<h3 style="color: #7BA1CD;">Active Goals:</h3>
        <ul>
          ${activeGoals.map(goal => {
            const progressPercentage = Math.min(Math.round((goal.progress / goal.target) * 100), 100);
            return `<li>${goal.title} - ${progressPercentage}% complete (${goal.progress}/${goal.target})</li>`;
          }).join('')}
        </ul>` : 
        `<p>No active goals at the moment.</p>`
      }
      
      ${completedGoals.length > 0 ? 
        `<h3 style="color: #7BA1CD;">Recently Completed Goals:</h3>
        <ul>
          ${completedGoals.slice(-5).map(goal => 
            `<li>${goal.title} - Completed on ${formatDate(new Date(goal.completedDate).toISOString().split('T')[0])}</li>`
          ).join('')}
        </ul>` : 
        `<p>No completed goals yet.</p>`
      }
    </div>
    
    <div style="margin-top: 20px;">
      <h2 style="color: #7BA1CD;">Insights & Recommendations</h2>
      ${generateInsights(entries, moodCounts, activityCounts)}
    </div>
  `;
  
  // Add the report content to the container
  reportContainer.innerHTML = reportHTML;
  
  // Generate PDF using html2canvas and jsPDF
  html2canvas(reportContainer, {
    scale: 1,
    useCORS: true
  }).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jspdf.jsPDF('p', 'pt', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 30;
    
    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save('mindful-insights-report.pdf');
    
    // Remove the temporary container
    document.body.removeChild(reportContainer);
    
    showNotification('PDF report generated successfully!', 'success');
  });
}

// Generate insights based on user data
function generateInsights(entries, moodCounts, activityCounts) {
  // No entries yet
  if (entries.length === 0) {
    return '<p>Start adding journal entries to get personalized insights!</p>';
  }
  
  let insights = '';
  
  // Mood patterns
  const dominantMood = Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b);
  insights += `<p>Your dominant mood is <strong>${dominantMood}</strong>.</p>`;
  
  // Check for activity correlations with positive moods
  if (entries.length >= 3) {
    const happyEntries = entries.filter(entry => entry.mood === 'happy');
    
    // Count activities in happy entries
    const happyActivities = {};
    happyEntries.forEach(entry => {
      entry.activities.forEach(activity => {
        happyActivities[activity] = (happyActivities[activity] || 0) + 1;
      });
    });
    
    // Find top activities correlated with happiness
    const topHappyActivities = Object.keys(happyActivities)
      .sort((a, b) => happyActivities[b] - happyActivities[a])
      .slice(0, 2);
    
    if (topHappyActivities.length > 0) {
      insights += `<p>Activities that seem to boost your mood: ${topHappyActivities.join(', ')}.</p>`;
    }
  }
  
  // Add recommendations based on data
  insights += '<h3 style="color: #7BA1CD;">Recommendations:</h3>';
  
  // If sad mood is prominent
  if (moodCounts.sad > entries.length * 0.3) {
    insights += `<p>Try incorporating more physical activity into your routine - exercise has been shown to boost mood!</p>`;
  }
  
  // General recommendations
  insights += `
    <p>Set small, achievable goals and celebrate when you complete them.</p>
    <p>Track your mood at the same time each day for the most consistent insights.</p>
  `;
  
  return insights;
}

// Get entries from local storage
function getEntries() {
  const entries = localStorage.getItem('mindful_entries');
  return entries ? JSON.parse(entries) : [];
}

// Show notification function
function showNotification(message, type = 'info') {
  // Check if notification container exists, create it if it doesn't
  let notificationContainer = document.querySelector('.notification-container');
  
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Trigger fade in
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Set timeout to remove notification
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notificationContainer.removeChild(notification);
    }, 300);
  }, 3000);
}

// Add event listener for dark mode toggle
document.addEventListener('DOMContentLoaded', () => {
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    // Check for saved user preference
    const darkMode = localStorage.getItem('dark_mode') === 'true';
    
    // Set initial state
    if (darkMode) {
      document.body.classList.add('dark-mode');
      darkModeToggle.checked = true;
    }
    
    // Add toggle handler
    darkModeToggle.addEventListener('change', () => {
      if (darkModeToggle.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('dark_mode', 'true');
      } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('dark_mode', 'false');
      }
    });
  }
  
  // Add tooltip initialization
  initializeTooltips();
});

// Initialize tooltips
function initializeTooltips() {
  const tooltips = document.querySelectorAll('[data-tooltip]');
  
  tooltips.forEach(tooltip => {
    tooltip.addEventListener('mouseenter', () => {
      const tooltipText = tooltip.getAttribute('data-tooltip');
      
      const tooltipElement = document.createElement('div');
      tooltipElement.className = 'tooltip';
      tooltipElement.textContent = tooltipText;
      
      document.body.appendChild(tooltipElement);
      
      const rect = tooltip.getBoundingClientRect();
      tooltipElement.style.top = `${rect.top + window.scrollY - tooltipElement.offsetHeight - 10}px`;
      tooltipElement.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltipElement.offsetWidth / 2)}px`;
      
      tooltipElement.classList.add('show');
      
      tooltip.addEventListener('mouseleave', () => {
        tooltipElement.classList.remove('show');
        setTimeout(() => {
          if (tooltipElement.parentNode) {
            tooltipElement.parentNode.removeChild(tooltipElement);
          }
        }, 300);
      });
    });
  });
}

// Add search functionality
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('entry-search');
  
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      searchEntries(query);
    });
  }
});

// Search entries function
function searchEntries(query) {
  const entries = getEntries();
  const entriesContainer = document.getElementById('entries-list');
  
  if (!entriesContainer) return;
  
  // Filter entries based on search query
  const filteredEntries = entries.filter(entry => {
    return entry.notes.toLowerCase().includes(query) ||
           entry.activities.some(activity => activity.toLowerCase().includes(query)) ||
           entry.mood.toLowerCase().includes(query);
  });
  
  // Display filtered entries
  displayEntries(filteredEntries);
}

// Add data export/import functionality
document.addEventListener('DOMContentLoaded', () => {
  const exportDataBtn = document.getElementById('export-data');
  const importDataBtn = document.getElementById('import-data');
  const fileInput = document.getElementById('import-file');
  
  if (exportDataBtn) {
    exportDataBtn.addEventListener('click', exportData);
  }
  
  if (importDataBtn && fileInput) {
    importDataBtn.addEventListener('click', () => {
      fileInput.click();
    });
    
    fileInput.addEventListener('change', importData);
  }
});

// Export data function
function exportData() {
  const data = {
    entries: getEntries(),
    goals: getGoals(),
    achievements: JSON.parse(localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY) || '[]'),
    streak: JSON.parse(localStorage.getItem(STREAK_STORAGE_KEY) || '{}')
  };
  
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `mindful_export_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  
  URL.revokeObjectURL(url);
  
  showNotification('Data exported successfully!', 'success');
}

// Import data function
function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      
      // Validate data structure
      if (!data.entries || !Array.isArray(data.entries)) {
        throw new Error('Invalid entries data');
      }
      
      // Confirm with user
      if (confirm('This will replace your current data. Continue?')) {
        // Save imported data
        localStorage.setItem('mindful_entries', JSON.stringify(data.entries));
        
        if (data.goals && Array.isArray(data.goals)) {
          localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(data.goals));
        }
        
        if (data.achievements && Array.isArray(data.achievements)) {
          localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(data.achievements));
        }
        
        if (data.streak && typeof data.streak === 'object') {
          localStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data.streak));
        }
        
        showNotification('Data imported successfully!', 'success');
        
        // Refresh displays
        displayEntries(data.entries);
        displayGoals();
        displayAchievements();
        
        // Update streak display if streak data was imported
        if (data.streak) {
          updateStreakDisplay(data.streak);
        }
      }
    } catch (error) {
      showNotification('Error importing data: ' + error.message, 'error');
    }
    
    // Reset file input
    e.target.value = '';
  };
  
  reader.readAsText(file);
}

// Helper function to display entries (used by search and import)
function displayEntries(entries) {
  const entriesContainer = document.getElementById('entries-list');
  
  if (!entriesContainer) return;
  
  if (entries.length === 0) {
    entriesContainer.innerHTML = '<p class="empty-state">No entries found.</p>';
    return;
  }
  
  let entriesHTML = '';
  
  // Sort entries by date, newest first
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  entries.forEach(entry => {
    const entryDate = new Date(entry.date);
    const formattedDate = entryDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Get mood emoji
    const moodEmoji = {
      'happy': '😊',
      'neutral': '😐',
      'sad': '😢'
    }[entry.mood] || '🤔';
    
    entriesHTML += `
      <div class="entry-card mood-${entry.mood}">
        <div class="entry-header">
          <span class="entry-date">${formattedDate}</span>
          <span class="entry-mood">${moodEmoji}</span>
        </div>
        <div class="entry-activities">
          ${entry.activities.map(activity => `<span class="activity-tag">${activity}</span>`).join('')}
        </div>
        <div class="entry-notes">${entry.notes}</div>
      </div>
    `;
  });
  
  entriesContainer.innerHTML = entriesHTML;
}

// Add guided meditation functionality
document.addEventListener('DOMContentLoaded', () => {
  const meditationButton = document.getElementById('start-meditation');
  
  if (meditationButton) {
    meditationButton.addEventListener('click', startMeditation);
  }
});

// Meditation functionality
function startMeditation() {
  // Create meditation modal
  const modal = document.createElement('div');
  modal.className = 'meditation-modal';
  
  modal.innerHTML = `
    <div class="meditation-container">
      <h2>Guided Breathing</h2>
      <div class="breathing-circle"></div>
      <div class="breathing-text">Get ready...</div>
      <div class="timer">2:00</div>
      <div class="meditation-controls">
        <button id="pause-meditation">Pause</button>
        <button id="stop-meditation">End Session</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  document.body.classList.add('no-scroll');
  
  // Set up breathing animation
  const breathingCircle = modal.querySelector('.breathing-circle');
  const breathingText = modal.querySelector('.breathing-text');
  const timerDisplay = modal.querySelector('.timer');
  
  // Set up controls
  const pauseButton = modal.querySelector('#pause-meditation');
  const stopButton = modal.querySelector('#stop-meditation');
  
  let isPaused = false;
  let currentPhase = 'inhale';
  let timeRemaining = 120; // 2 minutes in seconds
  let timerInterval;
  
  // Start the meditation timer
  timerInterval = setInterval(() => {
    if (!isPaused) {
      timeRemaining--;
      
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      
      timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        endMeditation(modal);
      }
    }
  }, 1000);
  
  // Start the breathing cycle
  setTimeout(() => {
    startBreathingCycle(breathingCircle, breathingText);
  }, 2000);
  
  // Breathing cycle function
  function startBreathingCycle() {
    if (!isPaused) {
      if (currentPhase === 'inhale') {
        breathingCircle.className = 'breathing-circle inhale';
        breathingText.textContent = 'Breathe in...';
        currentPhase = 'hold';
        setTimeout(() => startBreathingCycle(), 4000);
      } else if (currentPhase === 'hold') {
        breathingCircle.className = 'breathing-circle hold';
        breathingText.textContent = 'Hold...';
        currentPhase = 'exhale';
        setTimeout(() => startBreathingCycle(), 2000);
      } else {
        breathingCircle.className = 'breathing-circle exhale';
        breathingText.textContent = 'Breathe out...';
        currentPhase = 'inhale';
        setTimeout(() => startBreathingCycle(), 6000);
      }
    }
  }
  
  // Set up button handlers
  pauseButton.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    
    if (!isPaused) {
      startBreathingCycle();
    }
  });
  
  stopButton.addEventListener('click', () => {
    clearInterval(timerInterval);
    endMeditation(modal);
  });
}

// End meditation function
function endMeditation(modal) {
  // Add completion animation
  modal.querySelector('.meditation-container').classList.add('completed');
  
  // Update text
  modal.querySelector('.breathing-text').textContent = 'Session Complete';
  modal.querySelector('.timer').style.display = 'none';
  
  // Hide controls
  modal.querySelector('.meditation-controls').innerHTML = `
    <button id="close-meditation">Close</button>
  `;
  
  // Add close button handler
  modal.querySelector('#close-meditation').addEventListener('click', () => {
    document.body.removeChild(modal);
    document.body.classList.remove('no-scroll');
    
    // Log meditation in journal
    addMeditationToJournal();
  });
  
  // Auto close after 5 seconds
  setTimeout(() => {
    if (document.body.contains(modal)) {
      document.body.removeChild(modal);
      document.body.classList.remove('no-scroll');
      addMeditationToJournal();
    }
  }, 5000);
}

// Add meditation to journal
function addMeditationToJournal() {
  const entries = getEntries();
  
  // Check if there's already an entry for today
  const today = new Date().toISOString().split('T')[0];
  const todayEntry = entries.find(entry => entry.date.split('T')[0] === today);
  
  if (todayEntry) {
    // Update existing entry
    if (!todayEntry.activities.includes('Meditation')) {
      todayEntry.activities.push('Meditation');
      localStorage.setItem('mindful_entries', JSON.stringify(entries));
      showNotification('Meditation added to today\'s journal!', 'success');
    }
  } else {
    // Create new entry
    showNotification('Remember to journal about your meditation!', 'info');
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initializeMoodTracker();
  displayMoodHistory();
  displayInsights();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Form submission for tracker
  const trackerForm = document.querySelector('.tracker-form');
  if (trackerForm) {
    trackerForm.addEventListener('submit', saveEntry);
  }
  
  // Form submission for contact
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactSubmit);
  }
  
  // Time period selector for insights
  const timePeriodSelector = document.getElementById('time-period');
  if (timePeriodSelector) {
    timePeriodSelector.addEventListener('change', displayInsights);
  }
}

// Save a new mood entry
function saveEntry(e) {
  e.preventDefault();
  
  const mood = document.getElementById('mood').value;
  const journal = document.getElementById('journal').value;
  const activities = Array.from(document.querySelectorAll('input[name="activities"]:checked'))
    .map(checkbox => checkbox.value);
  const sleepQuality = document.getElementById('sleep-quality').value;
  
  if (!journal.trim()) {
    showNotification('Please write something in your journal', 'error');
    return;
  }
  
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    mood,
    journal,
    activities,
    sleepQuality
  };
  
  // Get existing entries
  const entries = getEntries();
  
  // Add new entry
  entries.push(entry);
  
  // Save to local storage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  
  // Reset form
  document.getElementById('journal').value = '';
  document.querySelectorAll('input[name="activities"]:checked')
    .forEach(checkbox => checkbox.checked = false);
  
  // Show success message
  showNotification('Entry saved successfully!', 'success');
  
  // Update displays
  displayMoodHistory();
  displayInsights();
}

// Get entries from local storage
function getEntries() {
  const entries = localStorage.getItem(STORAGE_KEY);
  return entries ? JSON.parse(entries) : [];
}

// Display mood history
function displayMoodHistory() {
  const moodHistoryElement = document.getElementById('mood-history');
  if (!moodHistoryElement) return;
  
  const entries = getEntries();
  
  // Limit to last 7 entries
  const recentEntries = entries.slice(-7).reverse();
  
  if (recentEntries.length === 0) {
    moodHistoryElement.innerHTML = '<p class="empty-state">No entries yet. Start tracking your mood!</p>';
    return;
  }
  
  let historyHTML = '<div class="entries-list">';
  
  recentEntries.forEach(entry => {
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
    
    const moodEmoji = getMoodEmoji(entry.mood);
    
    historyHTML += `
      <div class="entry-card">
        <div class="entry-header">
          <span class="entry-date">${formattedDate}</span>
          <span class="entry-mood">${moodEmoji}</span>
        </div>
        <div class="entry-content">
          <p>${entry.journal}</p>
        </div>
        <div class="entry-footer">
          ${entry.activities.map(activity => `<span class="activity-tag">${activity}</span>`).join('')}
          <span class="sleep-tag">Sleep: ${entry.sleepQuality}</span>
        </div>
        <button class="delete-btn" data-id="${entry.id}">Delete</button>
      </div>
    `;
  });
  
  historyHTML += '</div>';
  moodHistoryElement.innerHTML = historyHTML;
  
  // Add event listeners to delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      deleteEntry(this.getAttribute('data-id'));
    });
  });
}

// Delete an entry
function deleteEntry(id) {
  const entries = getEntries();
  const updatedEntries = entries.filter(entry => entry.id != id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
  
  displayMoodHistory();
  displayInsights();
  showNotification('Entry deleted', 'info');
}

// Display insights based on mood data
function displayInsights() {
  const insightsElement = document.getElementById('insights-container');
  if (!insightsElement) return;
  
  const entries = getEntries();
  
  if (entries.length === 0) {
    insightsElement.innerHTML = '<p class="empty-state">No data yet to generate insights.</p>';
    return;
  }
  
  // Get time period to analyze
  const timePeriod = document.getElementById('time-period')?.value || 'week';
  let filteredEntries = filterEntriesByTime(entries, timePeriod);
  
  if (filteredEntries.length === 0) {
    insightsElement.innerHTML = `<p class="empty-state">No entries for the selected time period (${timePeriod}).</p>`;
    return;
  }
  
  // Calculate mood distribution
  const moodCounts = {
    happy: 0,
    neutral: 0,
    sad: 0
  };
  
  filteredEntries.forEach(entry => {
    moodCounts[entry.mood]++;
  });
  
  // Calculate mood percentages
  const total = filteredEntries.length;
  const moodPercentages = {
    happy: Math.round((moodCounts.happy / total) * 100),
    neutral: Math.round((moodCounts.neutral / total) * 100),
    sad: Math.round((moodCounts.sad / total) * 100)
  };
  
  // Calculate most common activities during happy moods
  const happyActivities = getMostCommonActivities(
    filteredEntries.filter(entry => entry.mood === 'happy')
  );
  
  // Calculate most common activities during sad moods
  const sadActivities = getMostCommonActivities(
    filteredEntries.filter(entry => entry.mood === 'sad')
  );
  
  // Calculate sleep quality correlation
  const sleepCorrelation = calculateSleepMoodCorrelation(filteredEntries);
  
  // Generate insights HTML
  let insightsHTML = `
    <div class="insights-grid">
      <div class="insight-card mood-distribution">
        <h4>Mood Distribution</h4>
        <div class="mood-bars">
          <div class="mood-bar">
            <div class="mood-label">Happy 😊</div>
            <div class="mood-progress">
              <div class="progress-bar happy" style="width: ${moodPercentages.happy}%"></div>
              <span>${moodPercentages.happy}%</span>
            </div>
          </div>
          <div class="mood-bar">
            <div class="mood-label">Neutral 😐</div>
            <div class="mood-progress">
              <div class="progress-bar neutral" style="width: ${moodPercentages.neutral}%"></div>
              <span>${moodPercentages.neutral}%</span>
            </div>
          </div>
          <div class="mood-bar">
            <div class="mood-label">Sad 😞</div>
            <div class="mood-progress">
              <div class="progress-bar sad" style="width: ${moodPercentages.sad}%"></div>
              <span>${moodPercentages.sad}%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="insight-card correlations">
        <h4>Activity Impact</h4>
        ${happyActivities.length > 0 ? `
          <div class="correlation-item">
            <h5>Activities on happy days:</h5>
            <ul>
              ${happyActivities.map(act => `<li>${act.name} (${act.count} times)</li>`).join('')}
            </ul>
          </div>
        ` : '<p>Not enough data for happy days</p>'}
        
        ${sadActivities.length > 0 ? `
          <div class="correlation-item">
            <h5>Activities on sad days:</h5>
            <ul>
              ${sadActivities.map(act => `<li>${act.name} (${act.count} times)</li>`).join('')}
            </ul>
          </div>
        ` : '<p>Not enough data for sad days</p>'}
      </div>
      
      <div class="insight-card sleep-impact">
        <h4>Sleep Quality Impact</h4>
        ${sleepCorrelation ? `
          <p>${sleepCorrelation}</p>
        ` : '<p>Not enough data to determine sleep impact</p>'}
      </div>
      
      <div class="insight-card mood-trend">
        <h4>Mood Trend</h4>
        <div class="trend-chart">
          ${renderMoodTrend(filteredEntries)}
        </div>
      </div>
    </div>
  `;
  
  insightsElement.innerHTML = insightsHTML;
}

// Filter entries by time period
function filterEntriesByTime(entries, period) {
  const now = new Date();
  let cutoff = new Date();
  
  switch (period) {
    case 'week':
      cutoff.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoff.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      cutoff.setMonth(now.getMonth() - 3);
      break;
    case 'all':
      return entries;
    default:
      cutoff.setDate(now.getDate() - 7);
  }
  
  return entries.filter(entry => new Date(entry.date) >= cutoff);
}

// Get most common activities
function getMostCommonActivities(entries) {
  if (entries.length === 0) return [];
  
  const activityCounts = {};
  
  entries.forEach(entry => {
    entry.activities.forEach(activity => {
      activityCounts[activity] = (activityCounts[activity] || 0) + 1;
    });
  });
  
  return Object.keys(activityCounts)
    .map(name => ({ name, count: activityCounts[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3); // Top 3 activities
}

// Calculate sleep and mood correlation
function calculateSleepMoodCorrelation(entries) {
  if (entries.length < 3) return null;
  
  const sleepQualityMap = {
    'poor': 1,
    'fair': 2,
    'good': 3,
    'excellent': 4
  };
  
  const moodMap = {
    'sad': 1,
    'neutral': 2,
    'happy': 3
  };
  
  let totalSleepScore = 0;
  let totalMoodScore = 0;
  
  entries.forEach(entry => {
    totalSleepScore += sleepQualityMap[entry.sleepQuality] || 0;
    totalMoodScore += moodMap[entry.mood] || 0;
  });
  
  const avgSleep = totalSleepScore / entries.length;
  const avgMood = totalMoodScore / entries.length;
  
  if (avgSleep > 2.5 && avgMood > 2.5) {
    return "Better sleep quality seems to correspond with more positive moods.";
  } else if (avgSleep < 2 && avgMood < 2) {
    return "Poor sleep quality seems to correspond with more negative moods.";
  } else {
    return "No clear correlation between sleep quality and mood was found.";
  }
}

// Render mood trend visualization
function renderMoodTrend(entries) {
  if (entries.length < 2) return "<p>Need more entries to show trend</p>";
  
  const moodValues = {
    'sad': 1,
    'neutral': 2,
    'happy': 3
  };
  
  // Sort entries by date
  const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Create a simple line chart using divs
  let chartHTML = '<div class="trend-line">';
  
  sortedEntries.forEach((entry, index) => {
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    const moodValue = moodValues[entry.mood];
    const height = moodValue * 30; // Height in pixels
    const emoji = getMoodEmoji(entry.mood);
    
    chartHTML += `
      <div class="trend-point">
        <div class="trend-bar" style="height: ${height}px; background: var(--${entry.mood}-color);">
          <span class="trend-emoji">${emoji}</span>
        </div>
        <div class="trend-date">${formattedDate}</div>
      </div>
    `;
  });
  
  chartHTML += '</div>';
  return chartHTML;
}

// Get emoji for mood
function getMoodEmoji(mood) {
  switch (mood) {
    case 'happy': return '😊';
    case 'neutral': return '😐';
    case 'sad': return '😞';
    default: return '❓';
  }
}

// Initialize mood tracker UI
function initializeMoodTracker() {
  // Set today's date
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const dateElement = document.getElementById('today-date');
  if (dateElement) {
    dateElement.textContent = formattedDate;
  }
}

// Handle contact form
function handleContactSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const message = document.getElementById('message').value;
  
  if (!email || !message) {
    showNotification('Please fill in all fields', 'error');
    return;
  }
  
  // In a real app, you would send this to your backend
  console.log('Contact form submitted:', { email, message });
  
  // Reset form
  document.getElementById('email').value = '';
  document.getElementById('message').value = '';
  
  showNotification('Thank you for your message!', 'success');
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Force reflow to trigger animation
  notification.offsetHeight;
  
  notification.classList.add('show');
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}
