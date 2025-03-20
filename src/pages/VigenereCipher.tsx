
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VigenereCipher = () => {
  const { toast } = useToast();
  const [ciphertext, setCiphertext] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const [keyLength, setKeyLength] = useState<number | null>(null);
  const [decryptedText, setDecryptedText] = useState("");
  const [recoveredKey, setRecoveredKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [repeats, setRepeats] = useState<{text: string, positions: number[], distance: number}[]>([]);
  const [frequencies, setFrequencies] = useState<{[key: string]: {[key: string]: number}}>({}); 

  // Step 1: Find repeated sequences (Kasiski Examination)
  const findRepeatedSequences = () => {
    setLoading(true);
    setStep(1);
    setShowSteps(true);
    setRepeats([]);
    
    const repeatedSequences: {[key: string]: number[]} = {};
    
    // Look for sequences of length 3 or more
    for (let len = 3; len <= 5; len++) {
      for (let i = 0; i <= ciphertext.length - len; i++) {
        const sequence = ciphertext.substring(i, i + len);
        if (!repeatedSequences[sequence]) {
          repeatedSequences[sequence] = [];
        }
        repeatedSequences[sequence].push(i);
      }
    }
    
    // Filter sequences that appear more than once
    const significantRepeats: {text: string, positions: number[], distance: number}[] = [];
    
    for (const [seq, positions] of Object.entries(repeatedSequences)) {
      if (positions.length >= 2) {
        // Calculate the distances between occurrences
        const distances: number[] = [];
        for (let i = 1; i < positions.length; i++) {
          distances.push(positions[i] - positions[i-1]);
        }
        
        // Use the first distance as representative
        significantRepeats.push({
          text: seq,
          positions: positions,
          distance: distances[0]
        });
      }
    }
    
    // Sort by sequence length (longer sequences are more significant)
    significantRepeats.sort((a, b) => b.text.length - a.text.length);
    
    // Take top results
    const topRepeats = significantRepeats.slice(0, 10);
    setRepeats(topRepeats);
    
    setTimeout(() => {
      setLoading(false);
      setStep(2);
      
      // Find potential key length from the GCD of distances
      const distances = topRepeats.map(r => r.distance);
      let possibleKeyLength = findGCD(distances);
      
      if (possibleKeyLength < 2) possibleKeyLength = distances[0];
      setKeyLength(possibleKeyLength);
      
      toast({
        title: "Kasiski Examination Complete",
        description: `Estimated key length: ${possibleKeyLength}`,
      });
    }, 1500);
  };

  // Step 2: Apply frequency analysis to find the key
  const performFrequencyAnalysis = () => {
    if (!keyLength) return;
    
    setLoading(true);
    setStep(2);
    
    // Group characters by their position modulo key length
    const groups: string[] = Array(keyLength).fill('');
    
    for (let i = 0; i < ciphertext.length; i++) {
      const group = i % keyLength;
      groups[group] += ciphertext[i].toUpperCase();
    }
    
    // English letter frequencies
    const englishFreq = {
      'A': 0.082, 'B': 0.015, 'C': 0.028, 'D': 0.043, 'E': 0.127, 
      'F': 0.022, 'G': 0.020, 'H': 0.061, 'I': 0.070, 'J': 0.002, 
      'K': 0.008, 'L': 0.040, 'M': 0.024, 'N': 0.067, 'O': 0.075, 
      'P': 0.019, 'Q': 0.001, 'R': 0.060, 'S': 0.063, 'T': 0.091, 
      'U': 0.028, 'V': 0.010, 'W': 0.023, 'X': 0.001, 'Y': 0.020, 
      'Z': 0.001
    };
    
    // For each group, calculate letter frequencies and determine likely shift
    const key: string[] = [];
    const groupAnalysis: {[key: string]: {[key: string]: number}} = {};
    
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const frequencies: {[key: string]: number} = {};
      
      // Count letter frequencies in this group
      for (const char of group) {
        if (char >= 'A' && char <= 'Z') {
          frequencies[char] = (frequencies[char] || 0) + 1;
        }
      }
      
      // Convert to probabilities
      const total = group.length;
      for (const char in frequencies) {
        frequencies[char] = frequencies[char] / total;
      }
      
      groupAnalysis[`Group ${i+1}`] = frequencies;
      
      // Try each possible shift and calculate chi-squared statistic
      let bestShift = 0;
      let bestScore = Infinity;
      
      for (let shift = 0; shift < 26; shift++) {
        let score = 0;
        
        for (let j = 0; j < 26; j++) {
          const englishChar = String.fromCharCode(65 + j);
          const cipherChar = String.fromCharCode(65 + ((j + shift) % 26));
          
          const expected = englishFreq[englishChar] || 0;
          const observed = frequencies[cipherChar] || 0;
          
          score += Math.pow(observed - expected, 2) / (expected || 0.01);
        }
        
        if (score < bestScore) {
          bestScore = score;
          bestShift = shift;
        }
      }
      
      // Convert shift to key character
      const keyChar = String.fromCharCode(65 + (26 - bestShift) % 26);
      key.push(keyChar);
    }
    
    setFrequencies(groupAnalysis);
    
    const recoveredKey = key.join('');
    setRecoveredKey(recoveredKey);
    
    // Decrypt the message with the recovered key
    const decrypted = decrypt(ciphertext, recoveredKey);
    setDecryptedText(decrypted);
    
    setTimeout(() => {
      setLoading(false);
      setStep(3);
      toast({
        title: "Frequency Analysis Complete",
        description: `Recovered key: ${recoveredKey}`,
      });
    }, 1500);
  };

  // Helper function to find the GCD of an array of numbers
  const findGCD = (numbers: number[]): number => {
    const gcd = (a: number, b: number): number => {
      if (!b) return a;
      return gcd(b, a % b);
    };
    
    return numbers.reduce((result, num) => gcd(result, num), numbers[0]);
  };

  // Vigenere decrypt function
  const decrypt = (ciphertext: string, key: string): string => {
    let result = '';
    const normalizedCiphertext = ciphertext.toUpperCase().replace(/[^A-Z]/g, '');
    const normalizedKey = key.toUpperCase().replace(/[^A-Z]/g, '');
    
    if (normalizedKey.length === 0) return ciphertext;
    
    for (let i = 0; i < normalizedCiphertext.length; i++) {
      const charCode = normalizedCiphertext.charCodeAt(i);
      
      if (charCode >= 65 && charCode <= 90) {
        const keyChar = normalizedKey.charCodeAt(i % normalizedKey.length) - 65;
        const decryptedChar = String.fromCharCode(((charCode - 65 - keyChar + 26) % 26) + 65);
        result += decryptedChar;
      } else {
        result += normalizedCiphertext[i];
      }
    }
    
    return result;
  };
  
  const reset = () => {
    setShowSteps(false);
    setKeyLength(null);
    setDecryptedText("");
    setRecoveredKey("");
    setStep(1);
    setRepeats([]);
    setFrequencies({});
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-100 rounded-full">
          <Shield className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Vigenère Cipher Attack</h1>
          <p className="text-gray-600">
            Breaking the cipher using Kasiski Examination and Frequency Analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Input Ciphertext</CardTitle>
            <CardDescription>
              Enter the Vigenère-encrypted text you want to decrypt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[150px]"
              placeholder="Enter encrypted text here..."
              value={ciphertext}
              onChange={(e) => setCiphertext(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={findRepeatedSequences} 
                disabled={!ciphertext || ciphertext.length < 20 || loading}
              >
                {loading && step === 1 ? "Analyzing..." : "Start Attack"}
              </Button>
              <Button 
                variant="outline" 
                onClick={reset}
                disabled={!showSteps}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {showSteps && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>
                {step < 3 ? "Attack in progress..." : "Attack completed!"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="font-medium">Progress:</span>
                  <span>{step}/3</span>
                </div>
                <Progress value={(step / 3) * 100} className="h-2" />
                
                {keyLength && (
                  <div className="mt-4">
                    <div className="font-medium">Estimated Key Length:</div>
                    <div className="text-xl">{keyLength}</div>
                    
                    {step >= 2 && keyLength > 0 && (
                      <Button
                        className="mt-2"
                        onClick={performFrequencyAnalysis}
                        disabled={loading}
                      >
                        {loading && step === 2 ? "Analyzing Frequencies..." : "Perform Frequency Analysis"}
                      </Button>
                    )}
                  </div>
                )}
                
                {recoveredKey && (
                  <div className="mt-4">
                    <div className="font-medium">Recovered Key:</div>
                    <div className="text-xl font-mono bg-green-50 p-2 rounded border border-green-200">
                      {recoveredKey}
                    </div>
                  </div>
                )}
                
                {decryptedText && (
                  <div className="mt-4">
                    <div className="font-medium">Decrypted Text:</div>
                    <div className="bg-gray-50 p-3 rounded border text-sm font-mono">
                      {decryptedText}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showSteps && (
        <>
          <Separator className="my-8" />
          
          <div className="grid grid-cols-1 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Kasiski Examination</CardTitle>
                <CardDescription>
                  Finding repeated sequences in the ciphertext to determine the key length
                </CardDescription>
              </CardHeader>
              <CardContent>
                {step >= 1 && repeats.length > 0 ? (
                  <div className="space-y-4">
                    <p>Identified repeated sequences:</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sequence</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Positions</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {repeats.map((repeat, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap font-mono">{repeat.text}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{repeat.positions.join(', ')}</td>
                              <td className="px-6 py-4 whitespace-nowrap">{repeat.distance}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">
                        The key length is likely a factor of the distances between repeated sequences.
                        Based on the greatest common divisor (GCD) of these distances, the estimated key length is <strong>{keyLength}</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {loading && step === 1 ? "Analyzing repeated sequences..." : "Waiting to start analysis..."}
                  </div>
                )}
              </CardContent>
            </Card>

            {step >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 2: Frequency Analysis</CardTitle>
                  <CardDescription>
                    Analyzing letter frequencies for each character position modulo key length
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(frequencies).length > 0 ? (
                    <div className="space-y-4">
                      <p className="mb-2">
                        By analyzing the frequency of letters in each position and comparing to expected English letter frequencies,
                        we can determine the likely shift for each position in the key.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(frequencies).map(([group, freqData], index) => (
                          <div key={group} className="border rounded p-4">
                            <div className="font-medium mb-2">{group}</div>
                            <div className="text-sm">
                              Top letters:
                              {Object.entries(freqData)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([letter, freq], i) => (
                                  <span key={i} className="inline-block mx-1">
                                    {letter}: {(freq * 100).toFixed(1)}%
                                  </span>
                                ))}
                            </div>
                            <div className="mt-2 text-sm">
                              Key character: <span className="font-bold">{recoveredKey[index]}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {loading && step === 2 ? "Analyzing letter frequencies..." : "Waiting to start frequency analysis..."}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step >= 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Step 3: Decryption</CardTitle>
                  <CardDescription>
                    Decrypting the ciphertext using the recovered key
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-green-500 h-5 w-5" />
                      <span>Attack completed successfully!</span>
                    </div>
                    
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="font-medium mb-2">Recovered Key:</div>
                      <div className="text-xl font-mono">{recoveredKey}</div>
                    </div>
                    
                    <div>
                      <div className="font-medium mb-2">Decryption Process:</div>
                      <p className="text-sm">
                        For each character in position i of the ciphertext, we subtract the value of the key 
                        character at position (i mod key_length) to get the original plaintext character.
                      </p>
                      <div className="mt-4 text-sm text-gray-600">
                        <div className="font-medium">Decryption Formula:</div>
                        <div className="font-mono bg-gray-100 p-2 rounded mt-1">
                          plaintext[i] = (ciphertext[i] - key[i % key.length] + 26) % 26
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VigenereCipher;
