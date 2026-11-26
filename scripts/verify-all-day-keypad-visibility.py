"""Check the open training editor on an English Android demo after tapping a bottom set."""
import argparse
import re
import subprocess
import xml.etree.ElementTree as ET


def bounds(node):
    return tuple(map(int, re.findall(r"-?\d+", node.attrib["bounds"])))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--adb", default="adb")
    parser.add_argument("--serial", required=True)
    parser.add_argument("--context", required=True, help="Expected keypad title, e.g. Pull-up · Set 3 · Reps")
    args = parser.parse_args()
    adb = [args.adb, "-s", args.serial]
    subprocess.run([*adb, "shell", "uiautomator", "dump", "/sdcard/window.xml"], check=True)
    root = ET.fromstring(subprocess.check_output([*adb, "shell", "cat", "/sdcard/window.xml"]))
    nodes = list(root.iter("node"))
    assert any(n.get("text") == args.context for n in nodes), f"Missing keypad title {args.context}"
    dismiss = next(n for n in nodes if n.get("content-desc") == "Hide keyboard")
    row = next(n for n in nodes if n.get("resource-id", "").startswith("all-day-row-")
               and any(child.get("content-desc") == "weight" for child in n.iter()))
    viewport = next(n for n in reversed(nodes) if n.get("class") == "android.widget.ScrollView"
                    and any(child is row for child in n.iter()))
    fields = {n.get("content-desc") for n in row.iter()}
    assert {"weight", "reps"} <= fields and {"rpe", "rir"} & fields, fields
    top, bottom = bounds(row)[1::2]
    viewport_top, viewport_bottom = bounds(viewport)[1::2]
    keypad_top = bounds(dismiss)[1]
    print(f"{args.context}: row {top}..{bottom}, viewport {viewport_top}..{viewport_bottom}, keyboard {keypad_top}")
    assert viewport_top < top < bottom < viewport_bottom <= keypad_top


if __name__ == "__main__":
    main()
