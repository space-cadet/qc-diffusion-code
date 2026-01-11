export const boundaryConditionMap = {
    periodic: 0,
    reflective: 1,
    absorbing: 2,
};
export function getBoundaryCode(name) {
    if (!name)
        return boundaryConditionMap.periodic;
    const code = boundaryConditionMap[name];
    return typeof code === 'number' ? code : boundaryConditionMap.periodic;
}
