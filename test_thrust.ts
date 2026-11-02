import { getTTIThrustCoefficient } from './src/lib/apogee.js';

const Pa = 101325;
const P0 = 1.369 * 1e6;
const Gamma = 1.13;
const epsilon = Math.pow(41.1/13, 2);
const etanoz = 0.75;
const alpha_deg = 12;

console.log("epsilon:", epsilon);
console.log("TTI CF:", getTTIThrustCoefficient(P0, Pa, Gamma, epsilon, alpha_deg, etanoz));

