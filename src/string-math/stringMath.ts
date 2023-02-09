/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

/**
 * @public
 * Function to resolve string arethmetical expressions (equation).
 * This code is taken from [string-math](https://github.com/devrafalko/string-math) 
 * library by [devrafalko](https://github.com/devrafalko) and configured to be used 
 * in a typescript module.
 * For more details please visit: [here](https://github.com/devrafalko/string-math)
 * 
 * @param equation - Equation to resolve
 * @returns Result of the equation
 */
export function stringMath(equation: string): number {
    let callback: (errorObject: any, result: any) => any;
    const mulDiv = /([+-]?\d*\.?\d+(?:e[+-]\d+)?)\s*([*/])\s*([+-]?\d*\.?\d+(?:e[+-]\d+)?)/;
    const plusMin = /([+-]?\d*\.?\d+(?:e[+-]\d+)?)\s*([+-])\s*([+-]?\d*\.?\d+(?:e[+-]\d+)?)/;
    const parentheses = /(\d)?\s*\(([^()]*)\)\s*/;
    let current;

    while (equation.search(/^\s*([+-]?\d*\.?\d+(?:e[+-]\d+)?)\s*$/) === -1) {
        equation = fParentheses(equation);
        if (equation === current) return handleCallback(new SyntaxError('The equation is invalid.'), null);
        current = equation;
    }
    return handleCallback(null, +equation);

    function fParentheses(equation: string) {
        while (equation.search(parentheses) !== -1) {
            // @ts-ignore
            equation = equation.replace(parentheses, function (a, b, c) {
                c = fMulDiv(c);
                c = fPlusMin(c);
                return typeof b === 'string' ? b + '*' + c : c;
            });
        }
        equation = fMulDiv(equation);
        equation = fPlusMin(equation);
        return equation;
    }

    function fMulDiv(equation: string) {
        while (equation.search(mulDiv) !== -1) {
            equation = equation.replace(mulDiv, function (a) {
                const sides = mulDiv.exec(a);
                const result = sides![2] === '*' 
                    ? Number(sides![1]) * Number(sides![3]) 
                    : Number(sides![1]) / Number(sides![3]);
                return result >= 0 
                    ? '+' + result.toString() 
                    : result.toString();
            });
        }
        return equation;
    }

    function fPlusMin(equation: string) {
        equation = equation.replace(
            /([+-])([+-])(\d|\.)/g, 
            // @ts-ignore
            function (a, b, c, d) { 
                return (b === c ? '+' : '-') + d; 
            }
        );
        while (equation.search(plusMin) !== -1) {
            equation = equation.replace(plusMin, function (a) {
                const sides = plusMin.exec(a);
                return sides![2] === '+' 
                    ? (+sides![1] + +sides![3]).toString() 
                    : (Number(sides![1]) - Number(sides![3])).toString();
            });
        }
        return equation;
    }

    function handleCallback(errObject: any, result: any) {
        if (typeof callback !== 'function') {
            if (errObject !== null) throw errObject;
        } else {
            callback(errObject, result);
        }
        return result;

    }
}

