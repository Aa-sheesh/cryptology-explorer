
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Key, Lock, Unlock, Play, Pause, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";

// Mock DES encryption/decryption function for demonstration
const desEncrypt = (plaintext: string, key: string): string => {
  // This is a simplified mock of DES for demonstration
  // Convert to hex to simulate encryption
  return Array.from(plaintext)
    .map(char => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');
};

const desDecrypt = (ciphertext: string, key: string): string => {
  // This is a simplified mock of DES for demonstration
  // Convert from hex back to string
  try {
    const bytes = ciphertext.match(/.{1,2}/g) || [];
    return bytes
      .map(byte => String.fromCharCode(parseInt(byte, 16)))
      .join('');
  } catch (e) {
    return "Invalid ciphertext";
  }
};

// Generate a random DES key for demonstration
const generateRandomKey = (length: number = 8): string => {
  // In real DES, this would be 56 bits (8 bytes with parity)
  // For demonstration, we'll create a hex string
  const bytes = new Uint8Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};

interface FormValues {
  plaintext: string;
  keyspace: string;
  keyLength: string;
}

const DES = () => {
  const { toast } = useToast();
  const [ciphertext, setCiphertext] = useState("");
  const [actualKey, setActualKey] = useState("");
  const [recoveredKey, setRecoveredKey] = useState<string | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [keysChecked, setKeysChecked] = useState(0);
  const [keyRate, setKeyRate] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [attackLog, setAttackLog] = useState<string[]>([]);
  const [keysTried, setKeysTried] = useState<string[]>([]);
  const [useSmallKeyspace, setUseSmallKeyspace] = useState(true);

  const form = useForm<FormValues>({
    defaultValues: {
      plaintext: "Hello, DES!",
      keyspace: "0123456789ABCDEF",
      keyLength: "4",
    },
  });

  // Update ciphertext when actual key changes
  useEffect(() => {
    if (actualKey && form.getValues().plaintext) {
      const encrypted = desEncrypt(form.getValues().plaintext, actualKey);
      setCiphertext(encrypted);
    }
  }, [actualKey, form]);

  // Timer for attack simulation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isAttacking) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        simulateAttackProgress();
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAttacking]);

  // Generate new key and ciphertext
  const generateNewProblem = () => {
    const keyLength = parseInt(form.getValues().keyLength);
    const newKey = generateRandomKey(keyLength);
    setActualKey(newKey);
    toast({
      title: "New encryption created",
      description: `Generated a new ${keyLength * 8}-bit key.`,
    });
    
    resetAttack();
  };

  // Start the brute force attack
  const startAttack = () => {
    if (!ciphertext) {
      toast({
        title: "Error",
        description: "Please generate a ciphertext first",
        variant: "destructive",
      });
      return;
    }
    
    resetAttack();
    setIsAttacking(true);
    setStartTime(Date.now());
    
    // Log the start of the attack
    addToLog("Starting brute force attack...");
    addToLog(`Ciphertext: ${ciphertext}`);
    
    if (useSmallKeyspace) {
      // For demo purposes, we'll find the key quickly
      setTimeout(() => {
        simulateFindingKey();
      }, 5000); // Simulate finding the key after 5 seconds
    }
  };

  // Simulate attack progress
  const simulateAttackProgress = () => {
    if (!isAttacking) return;
    
    const keyspace = form.getValues().keyspace;
    const keyLength = parseInt(form.getValues().keyLength);
    
    // Total possible keys in our keyspace
    const totalPossibleKeys = Math.pow(keyspace.length, keyLength);
    
    if (useSmallKeyspace) {
      // Faster simulation for demo purposes
      const newKeysChecked = keysChecked + Math.floor(totalPossibleKeys / 20);
      setKeysChecked(Math.min(newKeysChecked, totalPossibleKeys));
      
      // Generate some random keys we've "tried"
      if (keysTried.length < 5) {
        const newKey = Array(keyLength).fill(0)
          .map(() => keyspace[Math.floor(Math.random() * keyspace.length)])
          .join('');
        
        setKeysTried(prev => [...prev, newKey]);
        addToLog(`Tried key: ${newKey} - Incorrect`);
      }
    } else {
      // Realistic simulation
      // In reality, DES has 2^56 possible keys, which is way too many to brute force in a browser
      const newKeysChecked = keysChecked + 1000000; // Simulate checking 1M keys per second
      setKeysChecked(newKeysChecked);
    }
    
    // Update progress percentage
    const newProgress = Math.min((keysChecked / totalPossibleKeys) * 100, 100);
    setProgress(newProgress);
    
    // Calculate key check rate
    if (elapsedTime > 0) {
      setKeyRate(keysChecked / elapsedTime);
    }
  };

  // Simulate finding the key
  const simulateFindingKey = () => {
    if (!isAttacking) return;
    
    setRecoveredKey(actualKey);
    setIsAttacking(false);
    
    // Log that we found the key
    addToLog(`Key found: ${actualKey}`);
    addToLog("Attack successful!");
    
    toast({
      title: "Success!",
      description: `Key recovered: ${actualKey}`,
    });
  };

  // Add a message to the attack log
  const addToLog = (message: string) => {
    setAttackLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Reset the attack state
  const resetAttack = () => {
    setIsAttacking(false);
    setProgress(0);
    setKeysChecked(0);
    setKeyRate(0);
    setElapsedTime(0);
    setRecoveredKey(null);
    setAttackLog([]);
    setKeysTried([]);
  };

  // Format large numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-red-100 rounded-full">
          <Key className="h-8 w-8 text-red-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">DES Brute Force Attack</h1>
          <p className="text-gray-600">
            Demonstrating how DES can be broken through exhaustive key search
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Encryption Setup</CardTitle>
            <CardDescription>
              Configure the plaintext and key parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="plaintext"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plaintext</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        The message to be encrypted with DES
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keyspace"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Space Characters</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormDescription>
                        Characters used to generate the key
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="keyLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Length (bytes)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="8" {...field} />
                      </FormControl>
                      <FormDescription>
                        Real DES uses 8 bytes (64 bits, with 56 effective bits)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox 
                    id="demo-mode" 
                    checked={useSmallKeyspace} 
                    onCheckedChange={(checked) => setUseSmallKeyspace(checked as boolean)} 
                  />
                  <label
                    htmlFor="demo-mode"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Use small key space (for demonstration)
                  </label>
                </div>

                <Button type="button" onClick={generateNewProblem}>
                  Generate New Key & Ciphertext
                </Button>

                {actualKey && (
                  <div className="mt-4 p-4 bg-gray-50 rounded border">
                    <div className="text-sm font-medium">Generated Key (hidden during attack):</div>
                    <div className="font-mono mt-1 text-green-600">
                      {isAttacking ? "********" : actualKey}
                    </div>
                    
                    <div className="text-sm font-medium mt-3">Ciphertext:</div>
                    <div className="font-mono mt-1 break-all">
                      {ciphertext}
                    </div>
                  </div>
                )}
              </div>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brute Force Attack</CardTitle>
            <CardDescription>
              Attempt to recover the encryption key by trying all possibilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={startAttack} 
                  disabled={isAttacking || !ciphertext}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Attack
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => setIsAttacking(false)} 
                  disabled={!isAttacking}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={resetAttack}
                  disabled={!keysChecked}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              {(keysChecked > 0 || isAttacking) && (
                <div className="space-y-3 mt-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{progress.toFixed(2)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-gray-500">Keys Checked</div>
                      <div className="font-mono">{formatNumber(keysChecked)}</div>
                    </div>
                    
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-gray-500">Keys/Second</div>
                      <div className="font-mono">{formatNumber(Math.round(keyRate))}</div>
                    </div>
                    
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-gray-500">Elapsed Time</div>
                      <div className="font-mono">{elapsedTime}s</div>
                    </div>
                    
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="text-gray-500">Status</div>
                      <div className="font-mono">
                        {isAttacking ? "Running" : keysChecked > 0 ? "Paused" : "Ready"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {recoveredKey && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center text-green-700 gap-2 mb-2">
                    <Unlock className="h-5 w-5" />
                    <div className="font-medium">Key Recovered!</div>
                  </div>
                  <div className="font-mono text-lg">{recoveredKey}</div>
                  <div className="mt-2 text-sm text-green-700">
                    Decrypted: {desDecrypt(ciphertext, recoveredKey)}
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              <div>
                <h3 className="text-sm font-medium mb-2">Attack Log:</h3>
                <div className="bg-black text-green-400 font-mono p-3 rounded-md text-xs h-[200px] overflow-y-auto">
                  {attackLog.length > 0 ? (
                    attackLog.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))
                  ) : (
                    <div className="text-gray-500">Start the attack to see logs...</div>
                  )}
                </div>
              </div>

              {keysTried.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Keys Tried:</h3>
                  <div className="flex flex-wrap gap-2">
                    {keysTried.map((key, i) => (
                      <div key={i} className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                        {key}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>About DES Brute Force Attacks</CardTitle>
          <CardDescription>
            Understanding the vulnerability of DES to exhaustive key search
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              The Data Encryption Standard (DES) uses a 56-bit key, which means there are 2<sup>56</sup> possible keys 
              (approximately 72 quadrillion). While this was considered secure in 1977 when DES was adopted, 
              modern computing power has made it vulnerable to brute force attacks.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-2">Historical DES Cracking</h3>
                <p className="text-sm">
                  In 1998, the Electronic Frontier Foundation built a specialized computer called "Deep Crack" 
                  that could break DES in 56 hours. By 1999, distributed computing efforts could crack DES in just 22 hours.
                </p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded">
                <h3 className="font-medium mb-2">Modern Alternatives</h3>
                <p className="text-sm">
                  DES has been replaced by AES (Advanced Encryption Standard), which uses key sizes of 128, 192, or 256 bits, 
                  making brute force attacks computationally infeasible with current technology.
                </p>
              </div>
            </div>
            
            <div className="text-sm bg-blue-50 p-4 rounded-md border border-blue-100 mt-4">
              <div className="font-medium mb-1">Note:</div>
              <p>
                This demonstration uses a simplified model of DES and artificially small key spaces to illustrate 
                the concept of a brute force attack. In a real-world scenario, breaking full DES would require 
                specialized hardware or massive distributed computing resources.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DES;
