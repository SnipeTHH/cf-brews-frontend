import React from 'react';

function SidebarItem({ icon: Icon, text, active, onClick, isSubItem = false }) {
  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium
        ${
          active
            ? 'bg-gray-800 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }
        ${isSubItem ? 'text-xs' : ''}
      `}
    >
      <Icon
        className={`mr-3 h-5 w-5 flex-shrink-0
          ${
            active
              ? 'text-gray-300'
              : 'text-gray-400 group-hover:text-gray-300'
          }
        `}
      />
      {text}
    </a>
  );
}

export default SidebarItem;
