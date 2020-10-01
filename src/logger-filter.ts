import clone from "clone";
import stringify from "json-stringify-safe";
import { serializeError } from "serialize-error";
import { DEFAULT_BLACK_LIST } from "./default-black-list";

type TItem = { [key: string]: any };

export class LoggerFilter {
  private readonly blackList: string[];
  private readonly whiteList: string[];

  private readonly placeholder: string = "*sensitive*";

  public constructor(
    includeBlackList: string[] = [],
    excludeBlackList: string[] = [],
    whiteList: string[] = []
  ) {
    this.blackList = this.generateBlackList(includeBlackList, excludeBlackList);
    this.whiteList = whiteList;
  }

  public process(item?: any): object {
    if (item === undefined || item === null || item.constructor !== Object) {
      return {};
    }

    return this.filterObject(this.clone(item));
  }

  private filterObject(item: TItem): TItem {
    const objectWithoutCircularReference = JSON.parse(stringify(item));
    Object.keys(item).forEach((key: string): void => {
      const innerObject = this.isPlainObject(item[key])
        ? objectWithoutCircularReference[key]
        : item[key];
      item[key] = this.filterItem(key, innerObject);
    });

    return item;
  }

  private filterItem(key: string, item: any): any {
    if (this.isOnBlacklist(key) && !this.isOnWhitelist(key)) {
      return this.placeholder;
    }

    if (item instanceof Error) {
      return serializeError(item);
    }

    if (this.isPlainObject(item)) {
      return this.filterObject(item);
    }

    if (this.isJSONString(item)) {
      return stringify(this.filterItem(key, JSON.parse(item)));
    }

    if (Array.isArray(item)) {
      return item.map(this.filterItem.bind(this, key));
    }

    return item;
  }

  private clone(item: object): object {
    return clone(item);
  }

  private isOnBlacklist(key: string): boolean {
    return this.blackList.some((blacklistedKey: string) =>
      key.toLocaleLowerCase().includes(blacklistedKey.toLocaleLowerCase())
    );
  }

  private isOnWhitelist(key: string): boolean {
    return this.whiteList.some((whitelistedKey: string) =>
      key.toLocaleLowerCase().includes(whitelistedKey.toLocaleLowerCase())
    );
  }

  private isPlainObject(value: any): boolean {
    return value?.constructor === Object;
  }

  private isJSONString(value: any): boolean {
    if (typeof value !== "string") {
      return false;
    }

    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
  }

  private generateBlackList(
    includeBlackList: string[],
    excludeBlackList: string[]
  ): string[] {
    const newBlackList = DEFAULT_BLACK_LIST.filter(
      (item: string): boolean => !excludeBlackList.includes(item)
    );
    return newBlackList.concat(includeBlackList);
  }
}
