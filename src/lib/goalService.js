// Goal management service
export const goalService = {
  getGoals: () => {
    try {
      const stored = localStorage.getItem('fitnessGoals');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading goals:', error);
      return [];
    }
  },

  saveGoals: (goals) => {
    try {
      localStorage.setItem('fitnessGoals', JSON.stringify(goals));
      return true;
    } catch (error) {
      console.error('Error saving goals:', error);
      return false;
    }
  },

  addGoal: (goal) => {
    const goals = goalService.getGoals();
    const newGoal = {
      ...goal,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      isActive: true
    };
    goals.push(newGoal);
    goalService.saveGoals(goals);
    return newGoal;
  },

  updateGoal: (goalId, updates) => {
    const goals = goalService.getGoals();
    const index = goals.findIndex(g => g.id === goalId);
    if (index !== -1) {
      goals[index] = { ...goals[index], ...updates };
      goalService.saveGoals(goals);
      return goals[index];
    }
    return null;
  },

  deleteGoal: (goalId) => {
    const goals = goalService.getGoals();
    const filtered = goals.filter(g => g.id !== goalId);
    goalService.saveGoals(filtered);
    return filtered;
  }
};
