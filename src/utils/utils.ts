
export function guid(): string {
    let d = Date.now();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

export const isDarkBackground = (r: number, g: number, b: number, a: number): boolean => {
    const brightness = r * 0.299 + g * 0.587 + b * 0.114
    if (brightness >= 0.5) {
        return false
    }
    return true
}
