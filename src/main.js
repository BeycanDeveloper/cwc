import fs from 'fs';
import CleanCSS from 'clean-css';
import UglifyJS from 'uglify-js';

function parseComponent(componentString) {
    const regex = /<template>([\s\S]*)<\/template>[\s\S]*<script>([\s\S]*)<\/script>[\s\S]*<style>([\s\S]*)<\/style>/;
    const matches = componentString.match(regex);
    if (matches) {
        const templateCode = matches[1].trim();
        const scriptCode = matches[2].trim();
        const styleCode = matches[3].trim();
        return { template: templateCode, script: scriptCode, style: styleCode };
    } else {
        throw new Error("Component string does not match expected format");
    }
}

function extractRunCode(inputString) {
    const pattern = /run:\s*\(\)\s*=>\s*{((?:[^{}]|(?:\{[^{}]*\}))+)}/g;
    const match = pattern.exec(inputString);
    if (match && match[1]) {
        return match[1].trim();
    } else {
        return null;
    }
}

fs.readFile('test/Button.html', 'utf8', (err, data) => {
    if (err) {
        return console.error(err);
    }
    
    let {template, script, style} = parseComponent(data);

    const metaData = (eval(script))();
    const scriptCode = extractRunCode(script);
    style = new CleanCSS().minify(style).styles;

    style = '`'+ style + '`';
    template = '`'+ template + '`';

    const result = UglifyJS.minify(`
        window.customElements.define('${metaData.name}', class extends HTMLElement {
            constructor(){
                super();
                const sheet = new CSSStyleSheet();
                sheet.replace(${style});
                this.attachShadow({ mode: 'open'});
                this.shadowRoot.innerHTML = ${template};
                this.shadowRoot.adoptedStyleSheets.push(sheet);
            } 
        });
        ${scriptCode}
    `);

    if (result.error) { 
        return console.error(result.error);
    }

    if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist');
    }

    fs.writeFile('dist/build.js', result.code, (err) => {
        if (err) {
            return console.error(err);
        }
        console.log('Builded!');
    });
});