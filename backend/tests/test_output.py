from app.output import normalize_outputs, parse_missing


def test_v3_outputs():
    result = normalize_outputs({"final_jd": "# JD\n正文", "missing_info": ["团队规模", "汇报对象"]})
    assert result.jd_markdown == "# JD\n正文"
    assert result.missing_info == ["团队规模", "汇报对象"]


def test_missing_info_as_json_string_or_bullets():
    assert parse_missing('["a", "b"]') == ["a", "b"]
    assert parse_missing("- 团队规模\n2. 汇报对象\n\n• 培养路径") == ["团队规模", "汇报对象", "培养路径"]
    assert parse_missing(None) == []
    assert parse_missing("") == []


def test_custom_keys_and_fallback_detection():
    assert normalize_outputs({"jd": "正文", "todo": ["x"]}, "jd", "todo").missing_info == ["x"]
    result = normalize_outputs({"result_text": "正文", "missing_items": "- x"})
    assert (result.jd_markdown, result.missing_info) == ("正文", ["x"])


def test_single_combined_text_is_split_on_heading():
    text = "# 岗位\n正文内容\n\n## 仍需人工补充的信息\n- 团队规模\n- 汇报对象\n"
    result = normalize_outputs({"output": text})
    assert result.jd_markdown == "# 岗位\n正文内容"
    assert result.missing_info == ["团队规模", "汇报对象"]


def test_empty_outputs():
    result = normalize_outputs({})
    assert result.jd_markdown == ""
    assert result.missing_info == []
