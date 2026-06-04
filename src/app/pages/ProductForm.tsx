import { useNavigate, useParams } from 'react-router';
import { useData } from '../context/DataContext';
import { ArrowLeft, Bold, ImagePlus, Italic, List, Save, Underline } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { LoadingState } from '../components/common/AsyncState';
import { measurementUnitService } from '../../services/masterService';

const stripHtml = (value: string) => value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const FONT_SIZE_OPTIONS = [
  { label: 'Small', value: '12px' },
  { label: 'Normal', value: '14px' },
  { label: 'Large', value: '16px' },
  { label: 'XL', value: '18px' },
];

export const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { products, addProduct, updateProduct, categories, brands, loading } = useData();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const specsEditorRef = useRef<HTMLDivElement | null>(null);
  const specSelectionRef = useRef<Range | null>(null);
  const [measurementUnits, setMeasurementUnits] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [selectedFontSize, setSelectedFontSize] = useState(FONT_SIZE_OPTIONS[1].value);

  const [formData, setFormData] = useState({
    image: '',
    images: [] as Array<{ id: string; imagePath: string; isPrimary: boolean; displayOrder: number }>,
    newImageFiles: [] as File[],
    primaryImageToken: '',
    name: '',
    modelNumber: '',
    category: '',
    categoryId: '',
    brand: '',
    unit: 'NOS',
    mrp: 0,
    usualSellingPrice: 0,
    leastSellingPrice: 0,
    specifications: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    measurementUnitService
      .list({ is_active: true })
      .then((response) => {
        const list = Array.isArray(response.data) ? response.data : [];
        setMeasurementUnits(list.map((unit: any) => ({
          id: String(unit.id),
          code: unit.code || '',
          name: unit.name || unit.code || '',
        })));
      })
      .catch(() => {
        setMeasurementUnits([
          { id: '1', code: 'NOS', name: 'NOS' },
          { id: '2', code: 'SQFT', name: 'SQFT' },
          { id: '3', code: 'SET', name: 'SET' },
          { id: '4', code: 'KG', name: 'KG' },
        ]);
      });
  }, []);

  useEffect(() => {
    if (id) {
      const product = products.find(p => p.id === id);
      if (product) {
        const matchingCategory = categories.find((category) => category.id === product.categoryId || category.name === product.category);
        setFormData({
          ...product,
          categoryId: product.categoryId || matchingCategory?.id || '',
          images: product.images || [],
          primaryImageToken: product.images?.find((image: any) => image.isPrimary)?.id ? `existing:${product.images.find((image: any) => image.isPrimary)?.id}` : '',
          newImageFiles: [],
        });
      }
    }
  }, [categories, id, products]);

  useEffect(() => {
    if (specsEditorRef.current && specsEditorRef.current.innerHTML !== formData.specifications) {
      specsEditorRef.current.innerHTML = formData.specifications || '';
    }
  }, [formData.specifications]);

  const syncCategory = (categoryIdOrName: string) => {
    const selectedCategory = categories.find((category) => category.id === categoryIdOrName || category.name === categoryIdOrName);

    setFormData((current) => ({
      ...current,
      category: selectedCategory?.name || '',
      categoryId: selectedCategory?.id || '',
    }));
  };

  const syncSpecifications = () => {
    setFormData((current) => ({
      ...current,
      specifications: specsEditorRef.current?.innerHTML || '',
    }));
  };

  const saveSpecSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (specsEditorRef.current?.contains(range.commonAncestorContainer)) {
      specSelectionRef.current = range.cloneRange();
    }
  };

  const restoreSpecSelection = () => {
    const selection = window.getSelection();
    const savedRange = specSelectionRef.current;
    if (!selection || !savedRange) return;

    selection.removeAllRanges();
    selection.addRange(savedRange);
  };

  const applySpecFormat = (command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList') => {
    specsEditorRef.current?.focus();
    restoreSpecSelection();
    document.execCommand(command);
    saveSpecSelection();
    syncSpecifications();
  };

  const applyFontSize = (fontSize: string) => {
    const editor = specsEditorRef.current;
    if (!editor) return;

    setSelectedFontSize(fontSize);
    editor.focus();
    restoreSpecSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.style.fontSize = fontSize;
      syncSpecifications();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      editor.style.fontSize = fontSize;
      syncSpecifications();
      return;
    }

    if (range.collapsed) {
      const span = document.createElement('span');
      span.style.fontSize = fontSize;
      span.appendChild(document.createTextNode('\u200B'));
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.setStart(span.firstChild as Text, 1);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
      specSelectionRef.current = newRange.cloneRange();
    } else {
      const extractedContents = range.extractContents();
      const span = document.createElement('span');
      span.style.fontSize = fontSize;
      span.appendChild(extractedContents);
      range.insertNode(span);

      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.removeAllRanges();
      selection.addRange(newRange);
      specSelectionRef.current = newRange.cloneRange();
    }

    syncSpecifications();
  };

  const clearSpecificationsFormatting = () => {
    const editor = specsEditorRef.current;
    if (!editor) return;

    const lines = editor.innerText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    editor.innerHTML = lines.length > 0 ? lines.map((line) => `<div>${line}</div>`).join('') : '';
    setSelectedFontSize(FONT_SIZE_OPTIONS[1].value);
    syncSpecifications();
  };

  const handleImageSelection = (files: FileList | null) => {
    const selectedFiles = Array.from(files || []);

    setFormData((current) => ({
      ...current,
      newImageFiles: [...current.newImageFiles, ...selectedFiles],
      primaryImageToken: current.primaryImageToken || (selectedFiles.length > 0 ? `new:${current.newImageFiles.length}` : current.primaryImageToken),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.name || !formData.modelNumber || (!formData.category && !formData.categoryId) || !formData.brand || !formData.unit || formData.mrp < 0 || formData.usualSellingPrice < 0 || formData.leastSellingPrice < 0) {
      toast.error('Please complete the required product fields');
      return;
    }

    setSubmitting(true);
    try {
      if (id) {
        await updateProduct(id, formData);
        toast.success('Product updated successfully');
      } else {
        await addProduct(formData);
        toast.success('Product added successfully');
      }
      navigate('/products');
    } catch (error: any) {
      setErrors(error.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/products')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-900">
            {id ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>

        {loading && id ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8">
            <LoadingState label="Loading product..." />
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Images
            </label>
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
                <ImagePlus className="h-4 w-4" />
                Upload multiple images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageSelection(e.target.files)}
                  className="hidden"
                />
              </label>
              {errors['product_images.0']?.[0] && <p className="mt-2 text-sm text-red-600">{errors['product_images.0'][0]}</p>}
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {formData.images.map((image) => (
                  <button
                    type="button"
                    key={`existing-${image.id}`}
                    onClick={() => setFormData({ ...formData, primaryImageToken: `existing:${image.id}` })}
                    className={`rounded-2xl border p-2 text-left ${formData.primaryImageToken === `existing:${image.id}` ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  >
                    <img src={image.imagePath} alt="" className="h-28 w-full rounded-xl object-cover" />
                    <div className="mt-2 text-xs font-medium text-gray-700">{formData.primaryImageToken === `existing:${image.id}` ? 'Primary image' : 'Set as primary'}</div>
                  </button>
                ))}
                {formData.newImageFiles.map((file, index) => (
                  <button
                    type="button"
                    key={`new-${index}-${file.name}`}
                    onClick={() => setFormData({ ...formData, primaryImageToken: `new:${index}` })}
                    className={`rounded-2xl border p-2 text-left ${formData.primaryImageToken === `new:${index}` ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  >
                    <img src={URL.createObjectURL(file)} alt="" className="h-28 w-full rounded-xl object-cover" />
                    <div className="mt-2 text-xs font-medium text-gray-700">{formData.primaryImageToken === `new:${index}` ? 'Primary image' : 'Set as primary'}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.product_name?.[0] && <p className="text-sm text-red-600 mt-1">{errors.product_name[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Number *
              </label>
              <input
                type="text"
                required
                value={formData.modelNumber}
                onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.model_number?.[0] && <p className="text-sm text-red-600 mt-1">{errors.model_number[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                required
                value={formData.categoryId || formData.category}
                onChange={(e) => syncCategory(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                {categories.filter(c => c.status === 'active').map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.category_id?.[0] && <p className="text-sm text-red-600 mt-1">{errors.category_id[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand *
              </label>
              <select
                required
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Brand</option>
                {brands.filter(b => b.status === 'active').map(brand => (
                  <option key={brand.id} value={brand.name}>{brand.name}</option>
                ))}
              </select>
              {errors.brand_id?.[0] && <p className="text-sm text-red-600 mt-1">{errors.brand_id[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Measurement Unit *
              </label>
              <select
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Measurement Unit</option>
                {measurementUnits.map((unit) => (
                  <option key={unit.id} value={unit.code}>{unit.name}</option>
                ))}
              </select>
              {errors.unit?.[0] && <p className="text-sm text-red-600 mt-1">{errors.unit[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MRP (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usual Selling Price (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.usualSellingPrice}
                onChange={(e) => setFormData({ ...formData, usualSellingPrice: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Least Selling Price (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.leastSellingPrice}
                onChange={(e) => setFormData({ ...formData, leastSellingPrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.least_selling_price?.[0] && <p className="text-sm text-red-600 mt-1">{errors.least_selling_price[0]}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST %
              </label>
              <input
                type="number"
                value={categories.find((category) => category.id === formData.categoryId)?.gstPercent ?? 0}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                HSN Code
              </label>
              <input
                type="text"
                value={categories.find((category) => category.id === formData.categoryId)?.hsnCode ?? ''}
                readOnly
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specifications
              </label>
              <div className="overflow-hidden rounded-2xl border border-gray-200">
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
                  <button type="button" onClick={() => applySpecFormat('bold')} className="rounded-lg p-2 text-gray-600 hover:bg-white"><Bold className="h-4 w-4" /></button>
                  <button type="button" onClick={() => applySpecFormat('italic')} className="rounded-lg p-2 text-gray-600 hover:bg-white"><Italic className="h-4 w-4" /></button>
                  <button type="button" onClick={() => applySpecFormat('underline')} className="rounded-lg p-2 text-gray-600 hover:bg-white"><Underline className="h-4 w-4" /></button>
                  <button type="button" onClick={() => applySpecFormat('insertUnorderedList')} className="rounded-lg p-2 text-gray-600 hover:bg-white"><List className="h-4 w-4" /></button>
                  <select
                    value={selectedFontSize}
                    onChange={(e) => applyFontSize(e.target.value)}
                    className="ml-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none"
                  >
                    {FONT_SIZE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={clearSpecificationsFormatting}
                    className="ml-auto rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Clear Formatting
                  </button>
                </div>
                <div
                  ref={specsEditorRef}
                  contentEditable
                  onMouseUp={saveSpecSelection}
                  onKeyUp={saveSpecSelection}
                  onFocus={saveSpecSelection}
                  onInput={(e) => setFormData({ ...formData, specifications: (e.target as HTMLDivElement).innerHTML })}
                  className="min-h-40 w-full px-4 py-3 outline-none"
                  suppressContentEditableWarning
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">These formatted specs will be shown in the quotation in the same style.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/products')}
              className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
            >
              <Save className="w-5 h-5" />
              {submitting ? 'Saving...' : `${id ? 'Update' : 'Save'} Product`}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
};
