import React from 'react';

const AchievementsGrid = ({ achievements = [] }) => {
  if (!achievements || achievements.length === 0) {
    return null;
  }

  return (
    <div className="achievements-section">
      <h3>🏆 Achievements</h3>
      <div className="achievements-grid">
        {achievements.map((achievement) => (
          <div key={achievement.code} className="achievement-card">
            <div className="achievement-icon">🏅</div>
            <div className="achievement-content">
              <strong>{achievement.title}</strong>
              <p>{achievement.description}</p>
              <span className="achievement-meta">+{achievement.xpReward} XP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsGrid;

