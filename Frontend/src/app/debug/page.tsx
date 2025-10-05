export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-600 mb-8">
          Tailwind CSS Debug Page
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Basic Styling</h2>
            <p className="text-gray-600 mb-4">
              This should have proper spacing, colors, and typography.
            </p>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Test Button
            </button>
          </div>
          
          <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-red-800 mb-4">Error Styling</h2>
            <p className="text-red-600 mb-4">
              This should have red colors and proper spacing.
            </p>
            <button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded">
              Error Button
            </button>
          </div>
          
          <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-green-800 mb-4">Success Styling</h2>
            <p className="text-green-600 mb-4">
              This should have green colors and proper spacing.
            </p>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
              Success Button
            </button>
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            If you can see this styled properly, Tailwind CSS is working!
          </h3>
          <p className="text-yellow-700">
            The background should be light yellow, text should be dark yellow, 
            and there should be proper spacing and borders.
          </p>
        </div>
      </div>
    </div>
  );
}


