
declare module 'pizzip' {
  export default class PizZip {
      constructor(data: any, options?: any);
      file(name: string): any;
      file(name: string, content: string): any;
      generate(options: any): any;
  }
}

declare module 'docxtemplater' {
  export default class Docxtemplater {
      constructor(zip: any, options?: any);
      render(data?: any): void;
      getZip(): any;
      loadZip(zip: any): this;
      setData(data: any): this;
      setOptions(options: any): this;
  }
}

// Fix for ExcelJS global environment issues
declare namespace NodeJS {
  interface Process {
    env: any;
  }
}
