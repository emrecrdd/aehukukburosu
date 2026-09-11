const Table = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className="
        w-full
        overflow-hidden
        rounded-2xl
        border
        border-gray-200
        bg-white
        shadow-[0_1px_2px_rgba(15,23,42,0.02)]
        dark:border-white/[0.07]
        dark:bg-[#0b1b33]
      "
    >
      <div className="overflow-x-auto">
        <table
          className={`
            min-w-full
            border-separate
            border-spacing-0
            ${className}
          `}
          {...props}
        >
          {children}
        </table>
      </div>
    </div>
  );
};

Table.Head = ({
  children,
  className = '',
}) => (
  <thead
    className={`
      bg-gray-50/80
      dark:bg-white/[0.025]
      ${className}
    `}
  >
    {children}
  </thead>
);

Table.Body = ({
  children,
  className = '',
}) => (
  <tbody
    className={`
      bg-white
      dark:bg-transparent
      ${className}
    `}
  >
    {children}
  </tbody>
);

Table.Row = ({
  children,
  className = '',
  hover = true,
  ...props
}) => (
  <tr
    className={`
      group
      border-b
      border-gray-100
      transition-colors
      last:border-b-0
      dark:border-white/[0.05]

      ${
        hover
          ? 'hover:bg-gray-50/70 dark:hover:bg-white/[0.025]'
          : ''
      }

      ${className}
    `}
    {...props}
  >
    {children}
  </tr>
);

Table.HeadCell = ({
  children,
  className = '',
  ...props
}) => (
  <th
    className={`
      whitespace-nowrap
      border-b
      border-gray-100
      px-4
      py-3
      text-left
      text-[10px]
      font-bold
      uppercase
      tracking-[0.08em]
      text-gray-400
      dark:border-white/[0.06]
      dark:text-slate-500
      md:px-5
      ${className}
    `}
    {...props}
  >
    {children}
  </th>
);

Table.Cell = ({
  children,
  className = '',
  ...props
}) => (
  <td
    className={`
      border-b
      border-gray-100
      px-4
      py-3.5
      text-sm
      text-gray-700
      last:border-b-0
      dark:border-white/[0.05]
      dark:text-slate-300
      md:px-5
      ${className}
    `}
    {...props}
  >
    {children}
  </td>
);

export default Table;