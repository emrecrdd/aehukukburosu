import { useEffect, useState } from 'react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import { Field, inputClass } from './FinanceFormBits.jsx';

export default function ReasonActionModal({ open, onClose, title, description, confirmLabel='Onayla', variant='danger', loading=false, onConfirm }) {
  const [reason,setReason]=useState('');
  useEffect(()=>{ if(open) setReason(''); },[open]);
  const submit=async()=>{ if(!reason.trim()) return; await onConfirm(reason.trim()); };
  return <Modal isOpen={open} onClose={onClose} title={title} footer={<><Button variant="outline" onClick={onClose}>Vazgeç</Button><Button variant={variant} loading={loading} disabled={!reason.trim()} onClick={submit}>{confirmLabel}</Button></>}>
    {description&&<p className="mb-4 text-sm text-gray-500">{description}</p>}
    <Field label="Gerekçe"><textarea rows="4" value={reason} onChange={e=>setReason(e.target.value)} className={`${inputClass} h-auto py-3`} /></Field>
  </Modal>;
}
