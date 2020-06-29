class CustomEl extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `Test
            <div>
                <custom-el-2></custom-el-2>
            </div>
        `;
    }
}

class CustomEl2 extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            Devo comparire
        `;
    }
}

customElements.define('custom-el', CustomEl);
customElements.define('custom-el-2', CustomEl2);