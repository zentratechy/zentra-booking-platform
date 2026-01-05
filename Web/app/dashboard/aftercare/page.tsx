'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/useToast';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import DashboardSidebar from '@/components/DashboardSidebar';

interface AftercareTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  content: string;
  isTemplate: boolean;
  createdAt: any;
  updatedAt: any;
}

const defaultTemplates: Omit<AftercareTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Facial Treatment Aftercare',
    description: 'Essential aftercare instructions for facial treatments including cleansing, moisturizing, and sun protection.',
    category: 'Facial',
    isTemplate: true,
    content: `# Facial Treatment Aftercare

## Immediate Aftercare (First 24 Hours)
- **Avoid touching your face** with unwashed hands
- **No makeup** for at least 6 hours after treatment
- **Gentle cleansing only** - use lukewarm water and mild cleanser
- **Apply recommended moisturizer** as directed by your therapist

## First Week
- **Use gentle, fragrance-free products** only
- **Avoid exfoliating** or harsh scrubs
- **Apply SPF 30+ daily** - sun protection is crucial
- **Stay hydrated** - drink plenty of water
- **Avoid saunas, steam rooms, and hot tubs**

## What to Expect
- **Slight redness** may occur for a few hours
- **Tightness or dryness** is normal and temporary
- **Avoid picking** at any flaking skin

## When to Contact Us
- Severe redness or irritation lasting more than 48 hours
- Any unusual reactions or concerns
- Questions about your treatment

## Recommended Products
- Gentle cleanser (as recommended by your therapist)
- Hydrating moisturizer
- Broad-spectrum SPF 30+ sunscreen
- Hyaluronic acid serum (if recommended)

**Remember:** Every skin is different. Follow your therapist's specific recommendations for best results.`
  },
  {
    name: 'Hair Color Aftercare',
    description: 'Comprehensive guide for maintaining vibrant hair color and preventing fading.',
    category: 'Hair',
    isTemplate: true,
    content: `# Hair Color Aftercare

## First 48 Hours
- **Avoid washing your hair** for at least 48 hours
- **Use cool water** when you do wash
- **Avoid heat styling** - let hair air dry
- **Sleep on a silk pillowcase** to prevent friction

## Color Protection
- **Use sulfate-free shampoo** specifically for colored hair
- **Wash with cool water** - hot water opens cuticles and releases color
- **Limit washing** to 2-3 times per week
- **Use color-safe conditioner** every time you wash

## Heat Protection
- **Always use heat protectant** before styling
- **Keep heat tools below 350°F**
- **Consider air drying** when possible
- **Use a diffuser** for blow drying

## Swimming & Sun
- **Wear a hat** in direct sunlight
- **Rinse hair immediately** after swimming
- **Use UV protection spray** for hair
- **Avoid chlorine** - wear a swim cap

## Maintenance Schedule
- **Touch-ups every 4-6 weeks** for roots
- **Gloss treatment every 6-8 weeks** for shine
- **Deep conditioning weekly**
- **Trim every 8-10 weeks** to maintain health

## Products to Avoid
- Clarifying shampoos
- Products with sulfates
- Harsh chemicals
- Over-washing

**Pro Tip:** Invest in quality color-safe products - your color will last longer and look better!`
  },
  {
    name: 'Waxing Aftercare',
    description: 'Important care instructions to prevent irritation and ingrown hairs after waxing.',
    category: 'Hair Removal',
    isTemplate: true,
    content: `# Waxing Aftercare

## First 24 Hours
- **Avoid hot baths, showers, and saunas**
- **No swimming** in pools or hot tubs
- **Wear loose, breathable clothing**
- **Avoid touching the waxed area**
- **No makeup** on waxed areas

## Daily Care
- **Gently exfoliate** 2-3 times per week starting 48 hours after waxing
- **Moisturize daily** with fragrance-free lotion
- **Use a gentle cleanser** - avoid harsh soaps
- **Apply aloe vera** if any redness occurs

## Preventing Ingrown Hairs
- **Exfoliate regularly** with a gentle scrub or loofah
- **Use ingrown hair prevention products**
- **Avoid tight clothing** that can cause friction
- **Don't pick at ingrown hairs** - see us for professional removal

## What to Expect
- **Redness and sensitivity** for 24-48 hours is normal
- **Small bumps** may appear - this is normal
- **Hair will grow back** in 3-6 weeks
- **Less hair growth** over time with regular waxing

## When to Contact Us
- Severe irritation or rash
- Signs of infection (pus, excessive redness, heat)
- Ingrown hairs that won't resolve
- Any concerns about your treatment

## Do's and Don'ts
### Do:
- Keep the area clean and dry
- Wear loose clothing
- Exfoliate regularly
- Moisturize daily

### Don't:
- Pick or scratch the area
- Use harsh products
- Expose to extreme heat
- Wear tight clothing immediately after

**Remember:** Regular waxing makes the process easier and less painful over time!`
  },
  {
    name: 'Massage Aftercare',
    description: 'Post-massage care instructions to maximize benefits and prevent soreness.',
    category: 'Wellness',
    isTemplate: true,
    content: `# Massage Aftercare

## Immediate Aftercare
- **Drink plenty of water** - aim for 8 glasses today
- **Rest and relax** - avoid strenuous activities
- **Take a warm bath** with Epsom salts if desired
- **Apply heat** to any sore areas

## First 24 Hours
- **Stay hydrated** - water helps flush out toxins
- **Eat light, healthy meals**
- **Avoid alcohol and caffeine** - they can dehydrate
- **Get plenty of sleep** - your body heals during rest

## Managing Soreness
- **Gentle stretching** can help with any stiffness
- **Apply ice** to any inflamed areas
- **Use heat** for muscle tension
- **Take a warm shower** to relax muscles

## Maximizing Benefits
- **Continue drinking water** for the next few days
- **Practice deep breathing** exercises
- **Maintain good posture**
- **Schedule regular massages** for ongoing benefits

## What to Expect
- **Slight soreness** is normal for 24-48 hours
- **Increased energy** may occur after 24 hours
- **Better sleep** the night after treatment
- **Improved flexibility** over the next few days

## When to Contact Us
- Severe or persistent pain
- Any unusual reactions
- Questions about your treatment
- Scheduling your next appointment

## Self-Care Tips
- **Stretch daily** to maintain flexibility
- **Practice stress management** techniques
- **Maintain regular massage schedule**
- **Listen to your body** - rest when needed

**Remember:** Massage is most effective when done regularly. Consider booking your next session!`
  },
  {
    name: 'Manicure Aftercare',
    description: 'Care instructions to maintain beautiful nails and extend the life of your manicure.',
    category: 'Nails',
    isTemplate: true,
    content: `# Manicure Aftercare

## First 24 Hours
- **Avoid water** as much as possible
- **Don't use your nails as tools**
- **Wear gloves** when doing household chores
- **Be gentle** with your hands

## Daily Care
- **Apply cuticle oil** daily to keep nails healthy
- **Moisturize hands** regularly with hand cream
- **Use gloves** when cleaning or gardening
- **Avoid picking** at polish or cuticles

## Extending Your Manicure
- **Apply top coat** every few days for extra protection
- **Use hand cream** to prevent dryness
- **Avoid harsh chemicals** without gloves
- **Don't bite or pick** at your nails

## Nail Health Tips
- **Keep nails dry** to prevent bacterial growth
- **Trim nails regularly** to maintain shape
- **File in one direction** to prevent splitting
- **Use a base coat** to protect natural nails

## What to Expect
- **Manicure should last** 7-10 days with proper care
- **Slight chipping** may occur at tips
- **Cuticles may grow** - don't cut them yourself
- **Nails will continue growing** - schedule regular appointments

## When to Contact Us
- Severe chipping or lifting
- Any nail concerns or questions
- Scheduling your next appointment
- Touch-ups needed

## Do's and Don'ts
### Do:
- Moisturize daily
- Use gloves for chores
- Apply cuticle oil
- Schedule regular appointments

### Don't:
- Use nails as tools
- Pick at polish
- Expose to harsh chemicals
- Cut cuticles yourself

**Pro Tip:** Regular manicures help maintain nail health and prevent problems!`
  },
  {
    name: 'Lash Treatment Aftercare',
    description: 'Care instructions for eyelash extensions and lash lift treatments.',
    category: 'Eyelashes',
    isTemplate: true,
    content: `# Lash Treatment Aftercare

## First 24 Hours
- **Keep lashes completely dry** - no water, steam, or moisture
- **Avoid sleeping on your face**
- **Don't touch or rub** your eyes
- **No makeup** around the eye area

## Daily Care
- **Clean lashes daily** with lash cleanser
- **Brush lashes** gently with a clean spoolie
- **Avoid oil-based products** near the eyes
- **Use oil-free makeup remover** only

## Sleeping & Activities
- **Sleep on your back** or side to avoid crushing lashes
- **Avoid rubbing eyes** when tired
- **Be gentle** when washing face
- **Use a silk pillowcase** to reduce friction

## Makeup Guidelines
- **Use oil-free mascara** if desired (not necessary)
- **Avoid waterproof products** - they're harder to remove
- **Use gentle makeup remover**
- **Don't use eyelash curlers**

## Maintenance Schedule
- **Fill appointments** every 2-3 weeks
- **Professional removal** when ready to stop
- **Regular cleaning** to prevent buildup
- **Avoid picking** at loose lashes

## What to Expect
- **Natural shedding** of 2-5 lashes per day is normal
- **Lashes will last** 4-6 weeks with proper care
- **Some lashes may fall out** - this is normal
- **Full set needed** after 6-8 weeks

## When to Contact Us
- Excessive lash loss
- Irritation or discomfort
- Scheduling your fill appointment
- Any concerns about your lashes

## Do's and Don'ts
### Do:
- Clean lashes daily
- Sleep on back/side
- Use gentle products
- Schedule regular fills

### Don't:
- Rub or pull lashes
- Use oil-based products
- Sleep on your face
- Use eyelash curlers

**Remember:** Proper care extends the life of your lash extensions!`
  }
];

export default function AftercarePage() {
  const { user } = useAuth();
  const { colorScheme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const [templates, setTemplates] = useState<AftercareTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['All', 'Facial', 'Hair', 'Hair Removal', 'Wellness', 'Nails', 'Eyelashes', 'General'];

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user]);

  const fetchTemplates = async () => {
    try {
      const templatesQuery = query(
        collection(db, 'aftercareTemplates'),
        where('businessId', '==', user!.uid),
        orderBy('createdAt', 'desc')
      );
      const templatesSnapshot = await getDocs(templatesQuery);
      const templatesData = templatesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AftercareTemplate[];

      setTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching templates:', error);
      showToast('Failed to fetch templates', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createTemplateFromDefault = async (template: Omit<AftercareTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTemplate = {
        ...template,
        businessId: user!.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'aftercareTemplates'), newTemplate);
      showToast('Aftercare template created successfully!', 'success');
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      showToast('Failed to create template', 'error');
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this aftercare template?')) return;

    try {
      await deleteDoc(doc(db, 'aftercareTemplates', templateId));
      showToast('Template deleted successfully!', 'success');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      showToast('Failed to delete template', 'error');
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-cream">
        <DashboardSidebar />
        <div className="ml-64 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading aftercare templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-cream">
      <DashboardSidebar />
      <div className="ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aftercare Documents</h1>
          <p className="text-gray-600">Create and manage aftercare instructions for your clients</p>
        </div>

        {/* Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search aftercare templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? 'text-white'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
                style={{
                  backgroundColor: selectedCategory === category ? colorScheme.colors.primary : undefined
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Template Library */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Aftercare Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {defaultTemplates.map((template, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {template.category}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Template</span>
                  <button
                    onClick={() => createTemplateFromDefault(template)}
                    className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: colorScheme.colors.primary }}
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Templates */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Aftercare Templates</h2>
            <Link
              href="/dashboard/aftercare/create"
              className="px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: colorScheme.colors.primary }}
            >
              Create New Template
            </Link>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No aftercare templates yet</h3>
              <p className="text-gray-600 mb-4">Create your first aftercare template or use one of our templates</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
                        {template.category}
                      </span>
                      {template.isTemplate && (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Template
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Aftercare</span>
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/aftercare/${template.id}`}
                        className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/dashboard/aftercare/${template.id}/preview`}
                        className="px-3 py-1 text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Preview
                      </Link>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
