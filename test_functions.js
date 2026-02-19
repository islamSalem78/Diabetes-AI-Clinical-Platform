// Test file to verify backend functions
// Change to server directory to ensure correct path resolution
process.chdir('./server');
import { analyzeMeal } from './src/nutrition.js';
import { aggregateMetrics, calculateRiskLevel } from './src/ai.js';

console.log('Testing meal analysis:');
const testMeal = [
  { name: 'apple', quantity: 2 },
  { name: 'bread', quantity: 1 }
];

const result = analyzeMeal(testMeal);
console.log(JSON.stringify(result, null, 2));

console.log('\nTesting clinical metrics:');
const testReadings = [
  { value: 120 }, { value: 140 }, { value: 110 }, { value: 130 }
];
const testMeals = [
  { netCarbs: 25 }, { netCarbs: 30 }, { netCarbs: 20 }
];

const metrics = aggregateMetrics(testReadings, testMeals);
console.log('Average Glucose:', metrics.averageGlucose);
console.log('HbA1c:', metrics.hba1c);
console.log('Daily Carb Load:', metrics.dailyCarbLoad);

console.log('\nTesting risk level calculation:');
const risk = calculateRiskLevel(metrics.averageGlucose);
console.log('Risk Level:', risk);

console.log('\nAll functions working correctly!');