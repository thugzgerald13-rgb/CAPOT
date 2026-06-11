const fs = require('fs');
// I will look at resequenceAccounts numeric logic.
const resequenceAccountsNumeric = (accountsList) => {
    const result = [];
    const rootAccounts = accountsList
      .filter(a => !a.parentId)
      .sort((a, b) => a.id.localeCompare(b.id));

    const processChildrenNumericRecursive = (oldParentId, newParentId) => {
      const children = accountsList
        .filter(a => a.parentId === oldParentId)
        .sort((a, b) => a.id.localeCompare(b.id));

      children.forEach((child) => {
        const childNewId = child.id;
        
        result.push({
          ...child,
          id: childNewId,
          parentId: newParentId
        });

        processChildrenNumericRecursive(child.id, childNewId);
      });
    };

    rootAccounts.forEach((root) => {
      const rootIdVal = root.id;

      const newRoot = {
        ...root,
        id: rootIdVal
      };
      result.push(newRoot);
      processChildrenNumericRecursive(root.id, rootIdVal);
    });

    const processedIds = new Set(result.map(r => r.id));
    accountsList.forEach(acc => {
      if (!processedIds.has(acc.id)) {
        result.push({ ...acc });
      }
    });

    return result;
}

const updateDescendants = (accountsList, oldId, newId) => {
    let currentList = [...accountsList];
    const oldPrefix = oldId.replace(/0+$/, '');
    const newPrefix = newId.replace(/0+$/, '');

    const children = currentList.filter(a => a.parentId === oldId);
    for (const child of children) {
      let childNewId = child.id;
      if (childNewId.startsWith(oldPrefix)) {
        childNewId = newPrefix + childNewId.slice(oldPrefix.length);
      }
      
      const index = currentList.findIndex(a => a.id === child.id);
      currentList[index] = { ...currentList[index], id: childNewId, parentId: newId };
      
      currentList = updateDescendants(currentList, child.id, childNewId);
    }
    return currentList;
  };

let accounts = [
  { id: "1000", parentId: undefined, name: "Root" },
  { id: "1100", parentId: "1000", name: "Child 1" },
  { id: "1200", parentId: "1000", name: "Child 2" },
];

let updatedAccounts = [...accounts];
const editingId = "1200";
const finalEditCode = "1220";

const index = updatedAccounts.findIndex(a => a.id === editingId);
updatedAccounts[index] = {
  ...updatedAccounts[index],
  id: finalEditCode
};

updatedAccounts = updateDescendants(updatedAccounts, editingId, finalEditCode);

console.log("Updated Accounts before resequence:", updatedAccounts);
let finalResult = resequenceAccountsNumeric(updatedAccounts);
console.log("Final Result after resequence:", finalResult);
