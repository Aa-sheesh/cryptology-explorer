
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Lock, Calculator, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MillerRabin = () => {
  const { toast } = useToast();
  const [number, setNumber] = useState<string>("");
  const [iterations, setIterations] = useState<string>("5");
  const [isProbablyPrime, setIsProbablyPrime] = useState<boolean | null>(null);
  const [testResults, setTestResults] = useState<{ a: number; result: boolean }[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [showSteps, setShowSteps] = useState(false);
  const [isComputing, setIsComputing] = useState(false);

  // Function to check if a number is prime using the Miller-Rabin primality test
  const isPrime = (n: number, k: number = 5): boolean => {
    // Clear previous results
    setTestResults([]);
    setSteps([]);
    addStep(`Testing ${n} for primality using Miller-Rabin test with ${k} iterations.`);

    // Handle edge cases
    if (n <= 1) {
      addStep(`${n} is less than or equal to 1, so it's not prime.`);
      return false;
    }
    if (n <= 3) {
      addStep(`${n} is 2 or 3, which are prime numbers.`);
      return true;
    }
    if (n % 2 === 0) {
      addStep(`${n} is even and greater than 2, so it's not prime.`);
      return false;
    }

    // Write n as 2^r * d + 1
    let r = 0;
    let d = n - 1;
    while (d % 2 === 0) {
      d /= 2;
      r++;
    }

    addStep(`Expressed ${n}-1 as 2^${r} × ${d}`);

    // Witness loop
    for (let i = 0; i < k; i++) {
      // Choose a random witness
      // In a real implementation, this should be cryptographically secure
      const a = 2 + Math.floor(Math.random() * (n - 4));
      addStep(`Iteration ${i+1}: Testing with base a = ${a}`);

      // Compute a^d mod n
      let x = modularExponentiation(a, d, n);
      addStep(`  Computing a^d mod n: ${a}^${d} mod ${n} = ${x}`);

      if (x === 1 || x === n - 1) {
        addStep(`  x = ${x}, which is 1 or n-1, so this test passes.`);
        setTestResults(prev => [...prev, { a, result: true }]);
        continue;
      }

      // Squaring sequence
      let passed = false;
      for (let j = 0; j < r - 1; j++) {
        x = modularExponentiation(x, 2, n);
        addStep(`  Computing x^2 mod n: ${x}`);

        if (x === n - 1) {
          addStep(`  x = n-1 = ${n-1}, so this test passes.`);
          passed = true;
          break;
        }
      }

      if (!passed) {
        addStep(`  Test failed with witness a = ${a}, so ${n} is composite.`);
        setTestResults(prev => [...prev, { a, result: false }]);
        return false;
      }

      setTestResults(prev => [...prev, { a, result: true }]);
    }

    addStep(`${n} is probably prime with probability at least 1 - 4^(-${k}).`);
    return true;
  };

  // Modular exponentiation: Computes (base^exponent) % modulus efficiently
  const modularExponentiation = (base: number, exponent: number, modulus: number): number => {
    if (modulus === 1) return 0;
    
    let result = 1;
    base = base % modulus;
    
    while (exponent > 0) {
      if (exponent % 2 === 1) {
        result = (result * base) % modulus;
      }
      exponent = Math.floor(exponent / 2);
      base = (base * base) % modulus;
    }
    
    return result;
  };

  // Add a step to the steps array
  const addStep = (step: string) => {
    setSteps(prev => [...prev, step]);
  };

  // Main function to test primality
  const testPrimality = () => {
    const num = parseInt(number);
    const iters = parseInt(iterations);
    
    if (isNaN(num) || num <= 0) {
      toast({
        title: "Invalid Number",
        description: "Please enter a positive integer.",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(iters) || iters <= 0 || iters > 100) {
      toast({
        title: "Invalid Iterations",
        description: "Please enter a number of iterations between 1 and 100.",
        variant: "destructive",
      });
      return;
    }
    
    setIsComputing(true);
    setShowSteps(true);
    
    // Using setTimeout to allow the UI to update before the computation starts
    setTimeout(() => {
      const result = isPrime(num, iters);
      setIsProbablyPrime(result);
      
      setIsComputing(false);
      
      toast({
        title: result ? "Probably Prime" : "Composite",
        description: result 
          ? `${num} is probably prime with high probability.` 
          : `${num} is definitely composite.`,
      });
    }, 100);
  };

  // Format large numbers with commas
  const formatNumber = (numStr: string): string => {
    if (!numStr) return "";
    const num = BigInt(numStr);
    return num.toLocaleString('en-US');
  };

  // Reset the test
  const resetTest = () => {
    setIsProbablyPrime(null);
    setTestResults([]);
    setSteps([]);
    setShowSteps(false);
  };

  // Generate a random probable prime
  const generatePrime = () => {
    // Generate a random odd number between 10^2 and 10^5
    const min = 100;
    const max = 100000;
    let candidate = Math.floor(Math.random() * (max - min + 1)) + min;
    if (candidate % 2 === 0) candidate++; // Make it odd
    
    setNumber(candidate.toString());
    resetTest();
  };

  // Generate a random composite number
  const generateComposite = () => {
    // Generate two random numbers and multiply them
    const a = Math.floor(Math.random() * 90) + 10; // 10-99
    const b = Math.floor(Math.random() * 90) + 10; // 10-99
    setNumber((a * b).toString());
    resetTest();
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-green-100 rounded-full">
          <Lock className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Miller-Rabin Primality Test</h1>
          <p className="text-gray-600">
            A probabilistic algorithm to determine if a number is prime
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Test a Number</CardTitle>
            <CardDescription>
              Enter a number to test for primality using the Miller-Rabin test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
                  Number to Test
                </label>
                <Input
                  id="number"
                  type="text"
                  placeholder="Enter a positive integer"
                  value={number}
                  onChange={(e) => {
                    // Allow only digits
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setNumber(value);
                    if (isProbablyPrime !== null) resetTest();
                  }}
                />
              </div>
              
              <div>
                <label htmlFor="iterations" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Iterations
                </label>
                <Input
                  id="iterations"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="Number of tests (1-100)"
                  value={iterations}
                  onChange={(e) => setIterations(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  More iterations increases accuracy but takes longer.
                </p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button onClick={testPrimality} disabled={!number || isComputing}>
                  {isComputing ? "Computing..." : "Test Primality"}
                </Button>
                <Button variant="outline" onClick={resetTest} disabled={isProbablyPrime === null}>
                  Reset
                </Button>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={generatePrime}>
                  Generate Probable Prime
                </Button>
                <Button variant="outline" onClick={generateComposite}>
                  Generate Composite
                </Button>
              </div>
              
              {isProbablyPrime !== null && (
                <div className={`mt-4 p-4 rounded-lg text-white ${isProbablyPrime ? 'bg-green-600' : 'bg-red-600'}`}>
                  <div className="flex items-center gap-2">
                    {isProbablyPrime ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    <span className="font-medium">
                      {isProbablyPrime
                        ? `${number} is probably prime`
                        : `${number} is definitely composite`}
                    </span>
                  </div>
                  <p className="text-sm mt-1">
                    {isProbablyPrime
                      ? `With probability > 1 - 4^(-${iterations})`
                      : "With 100% certainty"}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Witness values and their test outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {testResults.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Each witness value tests whether the number is composite.
                    If any witness declares "composite", the number is definitely not prime.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {testResults.map((result, i) => (
                    <div 
                      key={i}
                      className={`p-3 rounded ${
                        result.result ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="text-sm font-medium">Witness a = {result.a}</div>
                      <div className="text-xs mt-1 flex items-center gap-1">
                        {result.result ? (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-green-600">Passed test</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-red-600" />
                            <span className="text-red-600">Found to be composite</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {isComputing ? "Computing..." : "Run the test to see results"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showSteps && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Step-by-Step Execution</CardTitle>
            <CardDescription>
              Detailed calculation steps of the Miller-Rabin primality test
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="p-2 text-sm">
                  <span className="font-mono">&gt;</span> {step}
                </div>
              ))}
              {isComputing && (
                <div className="p-2 text-sm animate-pulse">
                  <span className="font-mono">&gt;</span> Computing...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>About Miller-Rabin Primality Test</CardTitle>
          <CardDescription>
            Understanding the mathematical principles behind the test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              The Miller-Rabin primality test is a probabilistic algorithm used in cryptography to determine whether a given number 
              is prime. Unlike deterministic primality tests, it may occasionally identify a composite number as prime, 
              but the probability of this error can be made arbitrarily small by increasing the number of test iterations.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-2">Mathematical Principle</h3>
                <p className="text-sm">
                  The test is based on Fermat's Little Theorem and the fact that in a prime field, the equation x² ≡ 1 (mod p)
                  has only two solutions: x ≡ 1 (mod p) and x ≡ -1 (mod p). If we find any other solution, the number must be composite.
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-2">Cryptographic Applications</h3>
                <p className="text-sm">
                  Miller-Rabin is widely used in cryptographic systems to generate large prime numbers for RSA encryption, 
                  Diffie-Hellman key exchange, and other public-key cryptography protocols that rely on the computational 
                  difficulty of factoring the product of two large primes.
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mt-4">
              <h3 className="font-medium mb-2">Algorithm Overview</h3>
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                <li>Express n-1 as 2<sup>r</sup>·d where d is odd</li>
                <li>Choose a random base a between 2 and n-2</li>
                <li>Compute x = a<sup>d</sup> mod n</li>
                <li>If x equals 1 or n-1, the test passes for this witness</li>
                <li>
                  Otherwise, repeatedly square x up to r-1 times:
                  <ul className="list-disc pl-5 mt-1">
                    <li>If x becomes n-1 at any point, the test passes</li>
                    <li>If x becomes 1 without first becoming n-1, the test fails</li>
                    <li>If we complete all r-1 squarings without x becoming n-1, the test fails</li>
                  </ul>
                </li>
                <li>If the test passes for all chosen bases a, the number is probably prime</li>
              </ol>
            </div>
            
            <div className="text-sm bg-blue-50 p-4 rounded-md border border-blue-100 mt-4">
              <div className="font-medium mb-1">Error Probability:</div>
              <p>
                The probability that the Miller-Rabin test incorrectly identifies a composite number as prime is at most 4<sup>-k</sup>, 
                where k is the number of iterations. With just 20 iterations, this probability is less than 10<sup>-12</sup>, 
                which is sufficiently small for most cryptographic applications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MillerRabin;
