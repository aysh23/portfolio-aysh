// Data storage setup
const STORAGE_KEY = 'mindful_entries';

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
