export function getFormValues(target) {
    const formData = new FormData(target);
    const data = {};
    for (let field of formData) {
        const [key, value] = field;
        data[key] = value;
    }
    return data;
}
    