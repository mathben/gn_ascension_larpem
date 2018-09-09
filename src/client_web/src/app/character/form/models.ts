interface Field{
  title: string;
  type: string;
  hint: string;
}

interface FormSection extends Field{
  fields: Field[];
}

interface Input extends Field{}

interface Textbox extends Field{
  lines: number;
}

interface Dropdown extends Field{
  options: DropdownOption[];
  action: (selection: any) => any;
}

interface MultiselectDropdown extends Field{
  options: DropdownOption[];
  action: (selection: any) => any;
}

interface Button extends Field{
  action: () => any;
}

interface DropdownOption{
  label: string;
  value: any;
}
