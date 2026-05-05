'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useAuth } from '@/frontend/context/AuthContext';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import Loader from '@/frontend/components/ui/Loader';
import { usePOFlow } from '../../layout';
import { cn } from '@/backend/lib/utils';

const CITIES = ['Mumbai', 'Pune', 'Bangalore', 'Chennai', 'Hyderabad', 'Delhi', 'Gurgaon', 'Noida', 'Ahmedabad', 'Kolkata', 'Jaipur', 'Kochi', 'Chandigarh'];
const PAYMENT_TERMS = [{ value: 'net_30', label: 'Net 30' }, { value: 'net_45', label: 'Net 45' }, { value: 'advance', label: 'Advance Payment' }];

export default function ContextWizardPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const orgId = params.orgId as string;
    const stepParam = searchParams.get('step');
    const { user } = useAuth();
    const { parsedInvoice, userContext, setUserContext, setCurrentStep, setResult, setError, setIsSubmitting } = usePOFlow();

    const [step, setStep] = useState(Number(stepParam) || 1);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Step 1
    const [selectedCity, setSelectedCity] = useState(userContext.city || '');
    const [entities, setEntities] = useState<any[]>([]);

    // Step 2
    const [selectedEntity, setSelectedEntity] = useState<any>(null);

    // Step 3
    const [vendorType, setVendorType] = useState<'empanelled' | 'new'>(userContext.vendor_type || 'empanelled');
    const [vendorSearch, setVendorSearch] = useState('');
    const [vendorResults, setVendorResults] = useState<any[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<any>(null);
    const [newVendorForm, setNewVendorForm] = useState({ legal_name: '', gstin: '', pan: '', line1: '', line2: '', city: '', state: '', pincode: '', payment_terms: 'net_30', contact_email: '', contact_phone: '' });
    const [creatingVendor, setCreatingVendor] = useState(false);

    // Step 5
    const [lineItems, setLineItems] = useState<any[]>(userContext.confirmed_line_items || []);

    useEffect(() => { if (!parsedInvoice && !loading) router.push(`/${orgId}/purchase-orders/new`); }, [parsedInvoice, loading, router, orgId]);
    useEffect(() => { if (stepParam) setStep(Number(stepParam)); }, [stepParam]);
    useEffect(() => { if (parsedInvoice?.vendor_name && vendorType === 'empanelled' && step === 3) searchVendors(parsedInvoice.vendor_name); }, [step, parsedInvoice, vendorType]);

    const searchVendors = useCallback(async (query: string) => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/zoho-po/vendors?orgId=${orgId}&search=${encodeURIComponent(query)}`);
            const data = await res.json();
            setVendorResults(data.vendors || []);
            if (data.vendors?.[0]?.match_score > 0.8) setSelectedVendor(data.vendors[0]);
        } catch { setVendorResults([]); }
        finally { setLoading(false); }
    }, [orgId]);

    const fetchEntities = useCallback(async (city: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/zoho-po/gst-entities?orgId=${orgId}&city=${encodeURIComponent(city)}`);
            const data = await res.json();
            setEntities(data.entities || []);
            if (data.entities?.length === 1) setSelectedEntity(data.entities[0]);
        } catch { setEntities([]); }
        finally { setLoading(false); }
    }, [orgId]);

    const goToStep = useCallback((s: number) => { setStep(s); setCurrentStep(s); router.push(`/${orgId}/purchase-orders/context?step=${s}`); }, [router, setCurrentStep, orgId]);

    const handleCitySelect = useCallback((city: string) => { setSelectedCity(city); setUserContext({ city }); fetchEntities(city); }, [fetchEntities, setUserContext]);
    const handleEntitySelect = useCallback((entity: any) => { setSelectedEntity(entity); setUserContext({ gstin: entity.gstin, billing_address_id: entity.id }); }, [setUserContext]);
    const handleVendorSelect = useCallback((match: any) => { setSelectedVendor(match); setUserContext({ vendor_type: 'empanelled', vendor_id: match.vendor.zoho_vendor_id }); }, [setUserContext]);

    const handleCreateVendor = useCallback(async () => {
        setCreatingVendor(true);
        try {
            const res = await fetch('/api/zoho-po/vendors', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ legal_name: newVendorForm.legal_name, gstin: newVendorForm.gstin, pan: newVendorForm.pan, billing_address: { line1: newVendorForm.line1, line2: newVendorForm.line2, city: newVendorForm.city, state: newVendorForm.state, pincode: newVendorForm.pincode, country: 'India' }, payment_terms: newVendorForm.payment_terms, contact_email: newVendorForm.contact_email, contact_phone: newVendorForm.contact_phone }),
            });
            const data = await res.json();
            if (data.success) { setSelectedVendor({ vendor: { id: '', zoho_vendor_id: data.vendor_id, vendor_name: data.vendor_name, is_empanelled: true }, match_score: 1, match_reason: 'Just created' }); setVendorType('empanelled'); }
            else alert(data.error || 'Failed to create vendor');
        } catch { alert('Network error'); }
        finally { setCreatingVendor(false); }
    }, [newVendorForm]);

    const handleSubmitPO = useCallback(async () => {
        setSubmitting(true); setIsSubmitting(true);
        try {
            const payload = {
                parsed_invoice: parsedInvoice,
                user_context: { city: selectedCity, gstin: selectedEntity?.gstin || '', vendor_type: selectedVendor ? 'empanelled' : 'new', vendor_id: selectedVendor?.vendor.zoho_vendor_id, billing_address_id: selectedEntity?.id || '', confirmed_line_items: lineItems, notes: '' }
            };
            const res = await fetch('/api/zoho-po/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.success) { setResult(data); router.push(`/${orgId}/purchase-orders/confirmation?poNumber=${data.po_number}&vendor=${encodeURIComponent(data.vendor_name)}&amount=${data.total_amount}&link=${encodeURIComponent(data.zoho_deep_link)}`); }
            else { setError(data.error || 'Failed to create PO'); setSubmitting(false); }
        } catch (err: any) { setError(err.message || 'Network error'); setSubmitting(false); }
        finally { setIsSubmitting(false); }
    }, [parsedInvoice, selectedCity, selectedEntity, selectedVendor, lineItems, router, setResult, setError, setIsSubmitting, orgId]);

    const updateLineItem = useCallback((index: number, field: string, value: any) => {
        setLineItems(prev => prev.map((item, i) => {
            if (i !== index) return item;
            const updated = { ...item, [field]: value };
            const qty = Number(updated.quantity) || 0;
            const rate = Number(updated.unit_price) || 0;
            const taxRate = Number(updated.tax_rate) || 0;
            const taxable = qty * rate;
            updated.tax_amount = (taxable * taxRate) / 100;
            updated.total_price = taxable + updated.tax_amount;
            return updated;
        }));
    }, []);
    const addLineItem = useCallback(() => setLineItems(prev => [...prev, { description: '', quantity: 1, unit: 'pcs', unit_price: 0, tax_rate: 18, tax_amount: 0, total_price: 0, hsn_code: '' }]), []);
    const removeLineItem = useCallback((index: number) => setLineItems(prev => prev.filter((_, i) => i !== index)), []);
    const grandTotal = lineItems.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

    if (!parsedInvoice) return <div className="flex items-center justify-center py-20"><Loader /></div>;

    return (
        <div className="space-y-6">
            {loading && <div className="flex items-center justify-center py-10"><Loader size="sm" /></div>}

            {/* STEP 1: CITY */}
            {step === 1 && (
                <div className="max-w-lg mx-auto space-y-6">
                    <div className="text-center"><h3 className="text-lg font-semibold text-text-primary">Which city is this PO for?</h3><p className="text-sm text-text-secondary">This determines the delivery address and GST treatment</p></div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {CITIES.map(city => (
                            <button key={city} onClick={() => handleCitySelect(city)} className={cn('p-3 rounded-lg border text-sm font-medium transition-all', selectedCity === city ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface hover:border-primary/50 text-text-primary')}>
                                {city}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end"><Button variant="primary" disabled={!selectedCity} onClick={() => goToStep(2)}>Next</Button></div>
                </div>
            )}

            {/* STEP 2: GST ENTITY */}
            {step === 2 && (
                <div className="max-w-lg mx-auto space-y-6">
                    <div className="text-center"><h3 className="text-lg font-semibold text-text-primary">Select GST Registration</h3><p className="text-sm text-text-secondary">Choose the GSTIN for this purchase order</p></div>
                    {entities.length === 0 ? <div className="text-center py-8 text-text-secondary text-sm">No GST entities found for {selectedCity}. <button onClick={() => goToStep(1)} className="text-primary underline">Change city</button></div> : (
                        <div className="space-y-3">
                            {entities.map((entity: any) => (
                                <button key={entity.id} onClick={() => handleEntitySelect(entity)} className={cn('w-full p-4 rounded-lg border text-left transition-all', selectedEntity?.id === entity.id ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50')}>
                                    <div className="font-medium text-text-primary">{entity.entity_name}</div>
                                    <div className="text-sm text-text-secondary mt-1">GSTIN: {entity.gstin}</div>
                                    <div className="text-xs text-text-tertiary">{entity.state_name}</div>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-between"><Button variant="outline" onClick={() => goToStep(1)}>Back</Button><Button variant="primary" disabled={!selectedEntity} onClick={() => goToStep(3)}>Next</Button></div>
                </div>
            )}

            {/* STEP 3: VENDOR */}
            {step === 3 && (
                <div className="max-w-lg mx-auto space-y-6">
                    <div className="text-center"><h3 className="text-lg font-semibold text-text-primary">Select Vendor</h3><p className="text-sm text-text-secondary">Is this an empanelled vendor or a new one?</p></div>
                    <div className="flex rounded-lg border border-border p-1 bg-surface">
                        <button onClick={() => setVendorType('empanelled')} className={cn('flex-1 py-2 text-sm font-medium rounded-md transition-all', vendorType === 'empanelled' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary')}>Empanelled</button>
                        <button onClick={() => setVendorType('new')} className={cn('flex-1 py-2 text-sm font-medium rounded-md transition-all', vendorType === 'new' ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary')}>New Vendor</button>
                    </div>

                    {vendorType === 'empanelled' ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <input type="text" value={vendorSearch} onChange={e => { setVendorSearch(e.target.value); searchVendors(e.target.value); }} placeholder="Search vendors..." className="w-full h-10 rounded-lg border border-border bg-surface px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary" />
                                {parsedInvoice?.vendor_name && !vendorSearch && <button onClick={() => { setVendorSearch(parsedInvoice.vendor_name); searchVendors(parsedInvoice.vendor_name); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary hover:underline">Use: {parsedInvoice.vendor_name}</button>}
                            </div>
                            {vendorResults.length > 0 && (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {vendorResults.map((match: any, i: number) => (
                                        <button key={i} onClick={() => handleVendorSelect(match)} className={cn('w-full p-3 rounded-lg border text-left transition-all', selectedVendor?.vendor.zoho_vendor_id === match.vendor.zoho_vendor_id ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50')}>
                                            <div className="flex items-center justify-between"><span className="font-medium text-text-primary">{match.vendor.vendor_name}</span><span className={cn('text-xs px-2 py-0.5 rounded-full', match.match_score > 0.8 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}>{Math.round(match.match_score * 100)}% match</span></div>
                                            {match.vendor.gstin && <div className="text-xs text-text-tertiary mt-1">GSTIN: {match.vendor.gstin}</div>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 bg-surface rounded-lg border border-border p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-xs text-text-secondary mb-1 block">Legal Name *</Label><Input value={newVendorForm.legal_name} onChange={e => setNewVendorForm(f => ({ ...f, legal_name: e.target.value }))} placeholder="Company Pvt. Ltd." /></div>
                                <div><Label className="text-xs text-text-secondary mb-1 block">GSTIN *</Label><Input value={newVendorForm.gstin} onChange={e => setNewVendorForm(f => ({ ...f, gstin: e.target.value.toUpperCase() }))} placeholder="27AABCU9603R1ZX" maxLength={15} /></div>
                                <div><Label className="text-xs text-text-secondary mb-1 block">PAN *</Label><Input value={newVendorForm.pan} onChange={e => setNewVendorForm(f => ({ ...f, pan: e.target.value.toUpperCase() }))} placeholder="AABCU9603R" maxLength={10} /></div>
                                <div><Label className="text-xs text-text-secondary mb-1 block">Payment Terms *</Label><select value={newVendorForm.payment_terms} onChange={e => setNewVendorForm(f => ({ ...f, payment_terms: e.target.value }))} className="w-full h-10 rounded-lg border border-border bg-surface px-3 text-sm">{PAYMENT_TERMS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                                <div className="col-span-2"><Label className="text-xs text-text-secondary mb-1 block">Address Line 1 *</Label><Input value={newVendorForm.line1} onChange={e => setNewVendorForm(f => ({ ...f, line1: e.target.value }))} placeholder="Street address" /></div>
                                <div className="col-span-2"><Label className="text-xs text-text-secondary mb-1 block">Address Line 2</Label><Input value={newVendorForm.line2} onChange={e => setNewVendorForm(f => ({ ...f, line2: e.target.value }))} placeholder="Building, Floor, etc." /></div>
                                <div><Label className="text-xs text-text-secondary mb-1 block">City *</Label><Input value={newVendorForm.city} onChange={e => setNewVendorForm(f => ({ ...f, city: e.target.value }))} placeholder="City" /></div>
                                <div><Label className="text-xs text-text-secondary mb-1 block">State *</Label><Input value={newVendorForm.state} onChange={e => setNewVendorForm(f => ({ ...f, state: e.target.value }))} placeholder="State" /></div>
                                <div><Label className="text-xs text-text-secondary mb-1 block">Pincode *</Label><Input value={newVendorForm.pincode} onChange={e => setNewVendorForm(f => ({ ...f, pincode: e.target.value }))} placeholder="400001" /></div>
                                <div><Label className="text-xs text-text-secondary mb-1 block">Email</Label><Input value={newVendorForm.contact_email} onChange={e => setNewVendorForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="vendor@company.com" type="email" /></div>
                            </div>
                            <Button variant="primary" onClick={handleCreateVendor} disabled={creatingVendor || !newVendorForm.legal_name || !newVendorForm.gstin || !newVendorForm.pan} className="w-full">{creatingVendor ? <Loader size="sm" /> : 'Create Vendor'}</Button>
                        </div>
                    )}
                    <div className="flex justify-between"><Button variant="outline" onClick={() => goToStep(2)}>Back</Button><Button variant="primary" disabled={!selectedVendor} onClick={() => goToStep(4)}>Next</Button></div>
                </div>
            )}

            {/* STEP 4: BILLING ADDRESS */}
            {step === 4 && (
                <div className="max-w-lg mx-auto space-y-6">
                    <div className="text-center"><h3 className="text-lg font-semibold text-text-primary">Billing Address</h3><p className="text-sm text-text-secondary">Confirm the billing address for this PO</p></div>
                    {selectedEntity && (
                        <div className="bg-surface rounded-lg border border-border p-5 space-y-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
                                <span className="font-semibold text-text-primary">{selectedEntity.entity_name}</span>
                            </div>
                            <div className="text-sm text-text-secondary pl-7">
                                <p>GSTIN: {selectedEntity.gstin}</p>
                                {selectedEntity.billing_address && <p className="mt-1">{selectedEntity.billing_address.line1}{selectedEntity.billing_address.line2 && `, ${selectedEntity.billing_address.line2}`}<br />{selectedEntity.billing_address.city}, {selectedEntity.billing_address.state} - {selectedEntity.billing_address.pincode}</p>}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between"><Button variant="outline" onClick={() => goToStep(3)}>Back</Button><Button variant="primary" onClick={() => goToStep(5)}>Confirm & Continue</Button></div>
                </div>
            )}

            {/* STEP 5: LINE ITEM REVIEW */}
            {step === 5 && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="text-center"><h3 className="text-lg font-semibold text-text-primary">Review Line Items</h3><p className="text-sm text-text-secondary">Verify all line items before creating the PO</p></div>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-primary"><span className="font-medium">GST Treatment: </span>{selectedEntity && selectedVendor?.vendor.gstin ? (selectedEntity.gstin.substring(0, 2) === selectedVendor.vendor.gstin?.substring(0, 2) ? 'Intra-state (CGST + SGST @ 9% each)' : 'Inter-state (IGST @ 18%)') : 'GST treatment will be determined based on vendor and entity states'}</div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-border"><th className="text-left py-2 px-3 text-text-tertiary font-medium">Description</th><th className="text-center py-2 px-3 text-text-tertiary font-medium w-20">Qty</th><th className="text-center py-2 px-3 text-text-tertiary font-medium w-20">Unit</th><th className="text-right py-2 px-3 text-text-tertiary font-medium w-28">Unit Price</th><th className="text-right py-2 px-3 text-text-tertiary font-medium w-20">Tax%</th><th className="text-right py-2 px-3 text-text-tertiary font-medium w-28">Total</th><th className="w-10"></th></tr></thead>
                            <tbody>
                                {lineItems.map((item, index) => (
                                    <tr key={index} className="border-b border-border/50 hover:bg-surface-elevated/50">
                                        <td className="py-2 px-3"><input value={item.description} onChange={e => updateLineItem(index, 'description', e.target.value)} className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm focus:border-primary focus:outline-none" /></td>
                                        <td className="py-2 px-3"><input type="number" value={item.quantity} onChange={e => updateLineItem(index, 'quantity', Number(e.target.value))} className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm text-center focus:border-primary focus:outline-none" min={1} /></td>
                                        <td className="py-2 px-3"><input value={item.unit} onChange={e => updateLineItem(index, 'unit', e.target.value)} className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm text-center focus:border-primary focus:outline-none" /></td>
                                        <td className="py-2 px-3"><input type="number" value={item.unit_price} onChange={e => updateLineItem(index, 'unit_price', Number(e.target.value))} className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm text-right focus:border-primary focus:outline-none" min={0} step={0.01} /></td>
                                        <td className="py-2 px-3"><input type="number" value={item.tax_rate} onChange={e => updateLineItem(index, 'tax_rate', Number(e.target.value))} className="w-full bg-transparent border border-border rounded px-2 py-1 text-sm text-right focus:border-primary focus:outline-none" min={0} max={100} /></td>
                                        <td className="py-2 px-3 text-right font-medium text-text-primary">{Number(item.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="py-2 px-3"><button onClick={() => removeLineItem(index)} className="text-error hover:bg-error/10 rounded p-1 transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center"><Button variant="outline" onClick={addLineItem} className="text-sm"><svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Add Item</Button><div className="text-right"><p className="text-sm text-text-secondary">Grand Total</p><p className="text-2xl font-bold text-text-primary">INR {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p></div></div>
                    <div className="flex justify-between pt-4"><Button variant="outline" onClick={() => goToStep(4)}>Back</Button><Button variant="success" disabled={lineItems.length === 0 || submitting} onClick={handleSubmitPO} className="px-6">{submitting ? <Loader size="sm" /> : 'Create Purchase Order'}</Button></div>
                </div>
            )}
        </div>
    );
}
