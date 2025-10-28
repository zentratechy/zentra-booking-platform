export default function Test() {
  return (
    <div className="min-h-screen bg-soft-cream p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-primary">Tailwind Test Page</h1>
        
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Spacing Test</h2>
          <p className="text-gray-600 mb-4">This text should have proper spacing.</p>
          <p className="text-gray-600">Second paragraph with margin above.</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-primary p-6 rounded-lg text-white">Primary Color</div>
          <div className="bg-secondary p-6 rounded-lg">Secondary Color</div>
          <div className="bg-soft-pink p-6 rounded-lg">Soft Pink</div>
        </div>

        <div className="flex space-x-4">
          <button className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-full">
            Primary Button
          </button>
          <button className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-full">
            Secondary Button
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs">Extra small text</p>
          <p className="text-sm">Small text</p>
          <p className="text-base">Base text</p>
          <p className="text-lg">Large text</p>
          <p className="text-xl">Extra large text</p>
          <p className="text-2xl">2XL text</p>
          <p className="text-3xl">3XL text</p>
        </div>
      </div>
    </div>
  );
}


