import { useState, useRef } from 'react';

export function getFormValues(target) {
    const formData = new FormData(target);
    const data = {};
    for (let field of formData) {
        const [key, value] = field;
        data[key] = value;
    }
    return data;
}

export function formatHHMMSS(date) {
    let hh = date.getHours();
    let mm = date.getMinutes();
    let ss = date.getSeconds();
    return [hh, mm, ss].map(n => String(n).padStart(2, '0')).join(':');
} 
export function useExtendedState(initial) {
    const [state, setState] = useState(initial);
    const ref = useRef(initial);
    ref.current = state;
    return [state, setState, ref];
}