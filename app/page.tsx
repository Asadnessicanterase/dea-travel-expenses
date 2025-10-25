
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Plane, 
  FileText, 
  CheckCircle, 
  CreditCard, 
  ArrowRight 
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 mb-16">
        <div className="inline-flex items-center gap-3 bg-blue-100 px-6 py-3 rounded-full text-blue-700 font-medium">
          <Plane className="h-5 w-5" />
          <span>Digital Euro Association</span>
        </div>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
          Travel Expenses
          <br />
          <span className="text-blue-600">Made Simple</span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Streamline your travel request approvals and expense management 
          with our comprehensive platform designed for efficiency.
        </p>

        <div className="flex gap-4 justify-center pt-4">
          <Link href="/signup">
            <Button size="lg" className="gap-2">
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline">
              Sign In
            </Button>
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 mt-20">
        <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
          <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <FileText className="h-7 w-7 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Submit Requests
          </h3>
          <p className="text-gray-600">
            Create detailed travel requests with all necessary information 
            for quick approvals.
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
          <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <CheckCircle className="h-7 w-7 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Quick Approvals
          </h3>
          <p className="text-gray-600">
            Approvers receive instant notifications and can review requests 
            with a single click.
          </p>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
          <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <CreditCard className="h-7 w-7 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Expense Claims
          </h3>
          <p className="text-gray-600">
            Submit expense claims with invoice uploads and track spending 
            against estimates.
          </p>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mt-24 bg-white rounded-2xl p-12 shadow-lg">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          How It Works
        </h2>
        
        <div className="grid md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
              1
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Submit Request</h4>
            <p className="text-sm text-gray-600">
              Fill out the travel request form with trip details
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
              2
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Get Approved</h4>
            <p className="text-sm text-gray-600">
              Approver reviews and approves your request
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
              3
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Submit Expenses</h4>
            <p className="text-sm text-gray-600">
              Upload invoices and expense claims after travel
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
              4
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Close Trip</h4>
            <p className="text-sm text-gray-600">
              Mark the trip complete once all expenses are submitted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
