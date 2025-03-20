
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// English letter frequency reference
const ENGLISH_FREQUENCIES = {
  'A': 0.082, 'B': 0.015, 'C': 0.028, 'D': 0.043, 'E': 0.127, 
  'F': 0.022, 'G': 0.020, 'H': 0.061, 'I': 0.070, 'J': 0.002, 
  'K': 0.008, 'L': 0.040, 'M': 0.024, 'N': 0.067, 'O': 0.075, 
  'P': 0.019, 'Q': 0.001, 'R': 0.060, 'S': 0.063, 'T': 0.091, 
  'U': 0.028, 'V': 0.010, 'W': 0.023, 'X': 0.001, 'Y': 0.020, 
  'Z': 0.001
};

// Sorted English letter frequencies for faster reference
const SORTED_FREQUENCIES = Object.entries(ENGLISH_FREQUENCIES)
  .sort((a, b) => b[1] - a[1])
  .map(([letter]) => letter);

// Most common letters in English
const COMMON_LETTERS = ['E', 'T', 'A', 'O', 'I', 'N', 'S', 'H', 'R', 'D', 'L', 'U'];

// Average Index of Coincidence for English text is around 0.067
const ENGLISH_IOC = 0.067;

// Sample ciphertext for demonstration
const SAMPLE_CIPHERTEXT = "KQOWEFVJPUJUUNUKGLMEKJINMWUXFQMKJBGWRLFNFGHUDWUUMBSVLPSNCMUEKQCTEQLFNFGLUDWUUZHKCE";
const SAMPLE_KEY = "CIPHER";

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
  const [possibleKeyLengths, setPossibleKeyLengths] = useState<{length: number, ioc: number}[]>([]);
  const [bestKeys, setBestKeys] = useState<{length: number, key: string, score: number}[]>([]);
  const [plaintext, setPlaintext] = useState("");  // For encryption demo
  const [encryptKey, setEncryptKey] = useState(""); // For encryption demo
  const [encryptedText, setEncryptedText] = useState(""); // For encryption demo
  const [showEncryptionDemo, setShowEncryptionDemo] = useState(false);

  // Vigenere encrypt function
  const encrypt = (plaintext: string, key: string): string => {
    let result = '';
    const normalizedPlaintext = plaintext.toUpperCase().replace(/[^A-Z]/g, '');
    const normalizedKey = key.toUpperCase().replace(/[^A-Z]/g, '');
    
    if (normalizedKey.length === 0) return plaintext;
    
    for (let i = 0; i < normalizedPlaintext.length; i++) {
      const charCode = normalizedPlaintext.charCodeAt(i);
      
      if (charCode >= 65 && charCode <= 90) {
        const keyChar = normalizedKey.charCodeAt(i % normalizedKey.length) - 65;
        const encryptedChar = String.fromCharCode(((charCode - 65 + keyChar) % 26) + 65);
        result += encryptedChar;
      } else {
        result += normalizedPlaintext[i];
      }
    }
    
    return result;
  };

  // Load sample data
  const loadSample = () => {
    setCiphertext(SAMPLE_CIPHERTEXT);
    toast({
      title: "Sample Loaded",
      description: `This text was encrypted with the key "${SAMPLE_KEY}"`,
    });
  };

  // Generate a test encrypted message
  const handleEncrypt = () => {
    if (!plaintext || !encryptKey) {
      toast({
        title: "Encryption Failed",
        description: "Please provide both plaintext and key",
        variant: "destructive"
      });
      return;
    }
    
    const encrypted = encrypt(plaintext, encryptKey);
    setEncryptedText(encrypted);
    
    toast({
      title: "Text Encrypted",
      description: `Successfully encrypted with key "${encryptKey.toUpperCase()}"`,
    });
  };

  // Copy the encrypted text to input
  const useEncryptedText = () => {
    setCiphertext(encryptedText);
    setShowEncryptionDemo(false);
    
    toast({
      title: "Text Copied",
      description: "Encrypted text moved to analysis input",
    });
  };

  // Step 1: Find repeated sequences (Kasiski Examination)
  const findRepeatedSequences = () => {
    setLoading(true);
    setStep(1);
    setShowSteps(true);
    setRepeats([]);
    setPossibleKeyLengths([]);
    setBestKeys([]);
    
    // Clean the ciphertext (remove spaces and non-alphabetic characters)
    const cleanCiphertext = ciphertext.toUpperCase().replace(/[^A-Z]/g, '');
    
    if (cleanCiphertext.length < 20) {
      toast({
        title: "Text Too Short",
        description: "Please provide a longer ciphertext for better analysis.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }
    
    const repeatedSequences: {[key: string]: number[]} = {};
    
    // Look for sequences of length 3 or more
    for (let len = 3; len <= 5; len++) {
      for (let i = 0; i <= cleanCiphertext.length - len; i++) {
        const sequence = cleanCiphertext.substring(i, i + len);
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
        // Calculate all distances between occurrences
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
    
    // Calculate Index of Coincidence for different key lengths
    const iocResults = calculateIoCForKeyLengths(cleanCiphertext);
    setPossibleKeyLengths(iocResults);
    
    setTimeout(() => {
      setLoading(false);
      
      // Find potential key length from both methods
      const distances = topRepeats.map(r => r.distance);
      const factorCount: {[key: number]: number} = {};
      
      // Get all factors of each distance
      for (const distance of distances) {
        if (distance > 1) {  // Skip distances of 1
          const factors = findFactors(distance);
          for (const factor of factors) {
            if (factor >= 2 && factor <= 15) {  // Consider factors between 2 and 15
              factorCount[factor] = (factorCount[factor] || 0) + 1;
            }
          }
        }
      }
      
      // Get key length candidates from Kasiski method
      const kasiskiCandidates = Object.entries(factorCount)
        .map(([factor, count]) => ({
          length: parseInt(factor),
          score: count
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(c => c.length);
      
      // Get key length candidates from IoC method
      const iocCandidates = iocResults
        .slice(0, 5)
        .map(c => c.length);
      
      // Try multiple promising key lengths
      const candidateLengths = new Set([...kasiskiCandidates, ...iocCandidates]);
      const candidates = Array.from(candidateLengths).filter(l => l >= 2 && l <= 15).slice(0, 5);
      
      // If we couldn't find candidates, try common key lengths
      if (candidates.length === 0) {
        candidates.push(3, 4, 5, 6, 7);
      }
      
      // Try multiple key lengths and find the best keys
      const keyResults: {length: number, key: string, score: number}[] = [];
      
      for (const length of candidates) {
        const result = improvedKeyRecovery(cleanCiphertext, length);
        keyResults.push({
          length,
          key: result.key,
          score: result.score
        });
      }
      
      // Sort by score (higher is better)
      keyResults.sort((a, b) => b.score - a.score);
      setBestKeys(keyResults);
      
      // Select the best key length
      if (keyResults.length > 0) {
        const bestLength = keyResults[0].length;
        setKeyLength(bestLength);
        
        // Now perform in-depth analysis with the selected key length
        setStep(2);
        handleKeyLengthSelected(cleanCiphertext, bestLength);
      } else {
        toast({
          title: "Analysis Failed",
          description: "Could not determine key length. Try a different ciphertext.",
          variant: "destructive"
        });
      }
    }, 1500);
  };

  // Find all factors of a number
  const findFactors = (num: number): number[] => {
    const factors: number[] = [];
    for (let i = 2; i <= Math.sqrt(num); i++) {
      if (num % i === 0) {
        factors.push(i);
        if (i !== num / i) {
          factors.push(num / i);
        }
      }
    }
    return factors.sort((a, b) => a - b);
  };
  
  // Calculate Index of Coincidence for different key lengths
  const calculateIoCForKeyLengths = (text: string) => {
    const results: {length: number, ioc: number}[] = [];
    
    // Try key lengths from 1 to 15
    for (let length = 1; length <= 15; length++) {
      let totalIoC = 0;
      
      // Divide text into 'length' columns
      for (let i = 0; i < length; i++) {
        // Get characters at position i, i+length, i+2*length, etc.
        let column = '';
        for (let j = i; j < text.length; j += length) {
          column += text[j];
        }
        
        // Calculate IoC for this column
        totalIoC += calculateColumnIoC(column);
      }
      
      // Average IoC for this key length
      const avgIoC = totalIoC / length;
      results.push({ length, ioc: avgIoC });
    }
    
    // Sort by how close IoC is to English text IoC (0.067)
    results.sort((a, b) => Math.abs(a.ioc - ENGLISH_IOC) - Math.abs(b.ioc - ENGLISH_IOC));
    return results;
  };
  
  // Calculate Index of Coincidence for a single column
  const calculateColumnIoC = (column: string) => {
    const frequencies: {[key: string]: number} = {};
    const length = column.length;
    
    // Count occurrences of each letter
    for (const char of column) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }
    
    // Calculate IoC formula: sum(fi * (fi-1)) / (N * (N-1))
    let sum = 0;
    for (const char in frequencies) {
      const count = frequencies[char];
      sum += count * (count - 1);
    }
    
    return length <= 1 ? 0 : sum / (length * (length - 1));
  };

  // Improved key recovery using chi-squared statistic
  const improvedKeyRecovery = (text: string, keyLength: number) => {
    // Group characters by position modulo key length
    const groups: string[] = Array(keyLength).fill('');
    
    for (let i = 0; i < text.length; i++) {
      const groupIndex = i % keyLength;
      groups[groupIndex] += text[i];
    }
    
    // For each group, find the best shift using chi-squared statistic
    const key: string[] = [];
    let totalScore = 0;
    
    for (const group of groups) {
      const { shift, score } = findBestShiftChiSquared(group);
      key.push(String.fromCharCode(65 + shift));
      totalScore += score;
    }
    
    // Calculate decryption fitness on a sample of text
    const sampleText = text.substring(0, Math.min(100, text.length));
    const decrypted = decrypt(sampleText, key.join(''));
    const textScore = scoreEnglishText(decrypted);
    
    return {
      key: key.join(''),
      score: textScore  // Higher score is better
    };
  };
  
  // Find the best shift using Chi-squared statistic
  const findBestShiftChiSquared = (text: string) => {
    // Get letter counts in the text
    const observed: number[] = Array(26).fill(0);
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) - 65;
      if (charCode >= 0 && charCode < 26) {
        observed[charCode]++;
      }
    }
    
    // Calculate expected counts based on English letter frequencies
    const expected: number[] = Array(26).fill(0);
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      expected[i] = text.length * ENGLISH_FREQUENCIES[letter as keyof typeof ENGLISH_FREQUENCIES];
    }
    
    // Try each shift and calculate chi-squared statistic
    let bestShift = 0;
    let lowestChiSquared = Infinity;
    
    for (let shift = 0; shift < 26; shift++) {
      let chiSquared = 0;
      
      for (let i = 0; i < 26; i++) {
        const shiftedIndex = (i + shift) % 26;
        const diff = observed[i] - expected[shiftedIndex];
        // Avoid division by zero
        if (expected[shiftedIndex] > 0) {
          chiSquared += (diff * diff) / expected[shiftedIndex];
        }
      }
      
      if (chiSquared < lowestChiSquared) {
        lowestChiSquared = chiSquared;
        bestShift = shift;
      }
    }
    
    return { shift: bestShift, score: 1 / (1 + lowestChiSquared) };  // Lower chi-squared is better
  };

  // Score English text based on n-gram frequencies and word patterns
  const scoreEnglishText = (text: string): number => {
    let score = 0;
    
    // Score based on common English letter frequencies
    const letterFreq: {[key: string]: number} = {};
    let totalLetters = 0;
    
    for (const char of text) {
      if (char >= 'A' && char <= 'Z') {
        letterFreq[char] = (letterFreq[char] || 0) + 1;
        totalLetters++;
      }
    }
    
    if (totalLetters === 0) return 0;
    
    // Score based on frequency of common English letters
    for (const letter of COMMON_LETTERS) {
      const freq = (letterFreq[letter] || 0) / totalLetters;
      if (letter === 'E' || letter === 'T') {
        score += freq * 2;  // Give more weight to E and T
      } else {
        score += freq;
      }
    }
    
    // Penalize uncommon letters
    const uncommonLetters = ['J', 'Q', 'X', 'Z'];
    for (const letter of uncommonLetters) {
      const freq = (letterFreq[letter] || 0) / totalLetters;
      score -= freq * 3;  // Penalize high frequency of uncommon letters
    }
    
    // Score based on common digrams (letter pairs)
    const commonDigrams = ['TH', 'HE', 'IN', 'ER', 'AN', 'RE'];
    for (let i = 0; i < text.length - 1; i++) {
      const digram = text.substring(i, i + 2);
      if (commonDigrams.includes(digram)) {
        score += 0.5;
      }
    }
    
    // Score based on vowel-consonant patterns
    const vowels = ['A', 'E', 'I', 'O', 'U'];
    let vowelCount = 0;
    let consonantCount = 0;
    let alternationCount = 0;
    let prevIsVowel = false;
    
    for (const char of text) {
      if (char < 'A' || char > 'Z') continue;
      
      const isVowel = vowels.includes(char);
      if (isVowel) {
        vowelCount++;
      } else {
        consonantCount++;
      }
      
      if ((isVowel && !prevIsVowel) || (!isVowel && prevIsVowel)) {
        alternationCount++;
      }
      
      prevIsVowel = isVowel;
    }
    
    // English typically has around 40% vowels
    const vowelRatio = vowelCount / (vowelCount + consonantCount);
    score += (1 - Math.abs(vowelRatio - 0.4)) * 3;
    
    // Alternation between vowels and consonants is common
    score += alternationCount / text.length * 2;
    
    return score;
  };

  // Handle selection of a key length
  const handleKeyLengthSelected = (cleanCiphertext: string, length: number) => {
    setLoading(true);
    
    // Group characters by their position modulo key length
    const groups: string[] = Array(length).fill('');
    
    for (let i = 0; i < cleanCiphertext.length; i++) {
      const group = i % length;
      groups[group] += cleanCiphertext[i];
    }
    
    // For each group, calculate letter frequencies
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
    }
    
    setFrequencies(groupAnalysis);
    
    // Get the best key
    const bestKey = bestKeys.find(k => k.length === length)?.key || '';
    setRecoveredKey(bestKey);
    
    // Decrypt with the recovered key
    const decrypted = decrypt(cleanCiphertext, bestKey);
    setDecryptedText(decrypted);
    
    // Try a few variations of the key to see if we get better results
    const keyVariations: string[] = [];
    const baseKey = bestKey.split('');
    
    // Generate some variations of the key by changing each position
    for (let i = 0; i < baseKey.length; i++) {
      const currentChar = baseKey[i].charCodeAt(0) - 65;
      
      // Try nearby characters
      for (let offset of [-1, 1, -2, 2]) {
        const newChar = ((currentChar + offset + 26) % 26) + 65;
        const newKeyArray = [...baseKey];
        newKeyArray[i] = String.fromCharCode(newChar);
        const newKey = newKeyArray.join('');
        
        const decryptedVariation = decrypt(cleanCiphertext, newKey);
        const score = scoreEnglishText(decryptedVariation);
        
        keyVariations.push(newKey);
      }
    }
    
    // Try each variation
    let bestVariation = bestKey;
    let bestScore = scoreEnglishText(decrypted);
    
    for (const variation of keyVariations) {
      const decryptedVariation = decrypt(cleanCiphertext, variation);
      const score = scoreEnglishText(decryptedVariation);
      
      if (score > bestScore) {
        bestScore = score;
        bestVariation = variation;
      }
    }
    
    // If we found a better key, use it
    if (bestVariation !== bestKey) {
      setRecoveredKey(bestVariation);
      setDecryptedText(decrypt(cleanCiphertext, bestVariation));
    }
    
    setTimeout(() => {
      setLoading(false);
      setStep(3);
      toast({
        title: "Analysis Complete",
        description: `Recovered key: ${recoveredKey}`,
      });
    }, 1000);
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
  
  // Step 2: Apply frequency analysis to find the key
  const performFrequencyAnalysis = () => {
    if (!keyLength) return;
    
    // Clean the ciphertext
    const cleanCiphertext = ciphertext.toUpperCase().replace(/[^A-Z]/g, '');
    handleKeyLengthSelected(cleanCiphertext, keyLength);
  };
  
  const reset = () => {
    setShowSteps(false);
    setKeyLength(null);
    setDecryptedText("");
    setRecoveredKey("");
    setStep(1);
    setRepeats([]);
    setFrequencies({});
    setPossibleKeyLengths([]);
    setBestKeys([]);
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
              <Button 
                variant="outline" 
                onClick={loadSample}
                disabled={loading}
              >
                Load Sample
              </Button>
            </div>
            
            <div className="mt-4">
              <Button 
                variant="link" 
                onClick={() => setShowEncryptionDemo(!showEncryptionDemo)}
                className="p-0 h-auto"
              >
                {showEncryptionDemo ? "Hide Encryption Tool" : "Create Your Own Cipher"}
              </Button>
              
              {showEncryptionDemo && (
                <div className="mt-2 p-4 border rounded-md">
                  <h3 className="text-sm font-medium mb-2">Encryption Tool</h3>
                  <div className="space-y-3">
                    <div>
                      <Input
                        placeholder="Enter plaintext to encrypt..."
                        value={plaintext}
                        onChange={(e) => setPlaintext(e.target.value)}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Enter encryption key..."
                        value={encryptKey}
                        onChange={(e) => setEncryptKey(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleEncrypt}>
                        Encrypt
                      </Button>
                      {encryptedText && (
                        <Button size="sm" variant="outline" onClick={useEncryptedText}>
                          Use This Text
                        </Button>
                      )}
                    </div>
                    {encryptedText && (
                      <div className="p-2 bg-gray-50 rounded border text-sm font-mono break-all">
                        {encryptedText}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                    
                    {step === 2 && keyLength > 0 && (
                      <Button
                        className="mt-2"
                        onClick={performFrequencyAnalysis}
                        disabled={loading}
                      >
                        {loading ? "Analyzing Frequencies..." : "Perform Frequency Analysis"}
                      </Button>
                    )}
                  </div>
                )}
                
                {bestKeys.length > 0 && (
                  <div className="mt-4">
                    <div className="font-medium">Possible Keys (by score):</div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Length</TableHead>
                          <TableHead>Score</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bestKeys.slice(0, 3).map((k, i) => (
                          <TableRow key={i} className={i === 0 ? "bg-green-50" : ""}>
                            <TableCell className="font-mono">{k.key}</TableCell>
                            <TableCell>{k.length}</TableCell>
                            <TableCell>{k.score.toFixed(4)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
                    <div className="bg-gray-50 p-3 rounded border text-sm font-mono overflow-auto max-h-48">
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
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Sequence</TableHead>
                            <TableHead>Positions</TableHead>
                            <TableHead>Distance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {repeats.map((repeat, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{repeat.text}</TableCell>
                              <TableCell>{repeat.positions.join(', ')}</TableCell>
                              <TableCell>{repeat.distance}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-4">
                      <p className="font-medium">Index of Coincidence Analysis:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                        {possibleKeyLengths.slice(0, 6).map((item, index) => (
                          <div 
                            key={index} 
                            className={`p-2 border rounded ${item.length === keyLength ? 'bg-green-50 border-green-300' : ''}`}
                          >
                            Length {item.length}: IoC = {item.ioc.toFixed(4)}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 mt-3">
                        The key length is likely a factor of the distances between repeated sequences,
                        or a length with IoC close to English text (0.067).
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
                              Key character: <span className="font-bold">{recoveredKey[index] || '?'}</span>
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
