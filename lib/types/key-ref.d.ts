/** 一个参与引用派生的供应商身份（settings 行里不含任何密钥材料）。 */
export interface KeyRefSource {
    preset: string;
    name: string;
    id: string;
}
/** 求某供应商的 API key 引用名。 @param p - 供应商身份（预置 id、显示名、行 id）。 @returns credentials 服务里的引用名。 */
export declare function keyRefFor(p: KeyRefSource): string;
//# sourceMappingURL=key-ref.d.ts.map