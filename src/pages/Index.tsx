
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Shield, Key, Lock } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">Cryptology Explorer</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore cryptographic algorithms and learn how they can be attacked through interactive demonstrations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center">
              <div className="mb-4 p-3 bg-blue-100 rounded-full">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Vigenère Cipher</h2>
              <p className="text-gray-600 text-center mb-4">
                Explore Kasiski Examination and Frequency Analysis to break this classical cipher.
              </p>
              <Button asChild className="mt-auto w-full">
                <Link to="/vigenere">Explore Attack</Link>
              </Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center">
              <div className="mb-4 p-3 bg-red-100 rounded-full">
                <Key className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">DES</h2>
              <p className="text-gray-600 text-center mb-4">
                Understand brute force attacks and differential cryptanalysis on Data Encryption Standard.
              </p>
              <Button asChild className="mt-auto w-full">
                <Link to="/des">Explore Attack</Link>
              </Button>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center">
              <div className="mb-4 p-3 bg-green-100 rounded-full">
                <Lock className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Miller-Rabin</h2>
              <p className="text-gray-600 text-center mb-4">
                Learn about probabilistic primality testing and how it's used in cryptography.
              </p>
              <Button asChild className="mt-auto w-full">
                <Link to="/miller-rabin">Explore Test</Link>
              </Button>
            </div>
          </Card>
        </div>

        <Separator className="my-12" />

        <div className="text-center mt-8">
          <h2 className="text-2xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            Select an algorithm above to see step-by-step visualizations of how cryptographic attacks work.
            Each demonstration includes interactive elements to help you understand the process.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
