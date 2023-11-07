
export const findConsecutiveRanges = (numbers: number[]): [number, number][] => {
    numbers.sort((a, b) => a - b);
    const ranges: [number, number][] = [];

    let start = numbers[0];
    let end = numbers[0];

    for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] === end + 1) {
            end = numbers[i];
        } else {
            ranges.push([start, end]);
            start = numbers[i];
            end = numbers[i];
        }
    }

    ranges.push([start, end]);
    return ranges;
}

export function convertRemToPx(rem: number): number {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export function convertViewtoPx(input: number, height: number): number {
    return height * (input / 100)
}

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
