using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using Newtonsoft.Json;

namespace Helper
{
	class Program
	{
		static void Main(string[] args)
		{
			//GenerateCultures();
			ShowMonthNames("en", "ja", "da", "ko", "pt", "sv", "de", "es", "fr", "it", "no", "fi", "tr", "cs", "ru", "el", "nl");
		}

		static void ShowMonthNames(params string[] cultures)
		{
			var lines = new List<string>();

			foreach (var c in cultures)
			{
				var culture = CultureInfo.GetCultureInfo(c);

				lines.Add(culture.DisplayName);

				for (int i = 0; i < 12; i++)
				{
					var date = new DateTime(2000, i + 1, 1);
					lines.Add("\t" + date.ToString("MMM", culture) + "\t\t" + date.ToString("MMMM", culture));
				}

				lines.Add("");
			}

			File.WriteAllLines("months.c", lines);
		}

		static void GenerateCultures()
		{
			var exclude = new string[] {
				"", "zh-CHS", "zh-CHT", "syr", "ku-Arab", "ha-Latn", "ff-Latn", "tzm-Latn", "iu-Latn",
				"chr-Cher", "sd-Arab", "mn-Mong", "pa-Arab", "uz-Latn", "tg-Cyrl", "dsb", "smj",
				"tzm-Tfng", "iu-Cans", "mn-Cyrl", "uz-Cyrl", "sma", "az-Latn", "sms", "tzm", "ff",
				"ha", "smn", "sr-Latn", "sr-Cyrl", "bs-Latn", "bs-Cyrl", "az-Cyrl", "ku", "prs",
				"wo", "qut", "sah", "gsw", "oc", "moh", "arn", "ii", "nso", "ti", "ig",
				"or", "ta", "te", "haw", "mk", "nqo", "zgh", "zgh-Tfng", "st", "sn", "sn-Latn",
				"om", "my", "mg", "gn", "jv", "jv-Latn", "ts", "so", "xh", "zu",
			};

			var change = new Dictionary<string, string>
			{
				{ "zh-Hans", "zh-CN" },
				{ "zh-Hant", "zh-TW" },
			};

			var cultures = CultureInfo.GetCultures(CultureTypes.NeutralCultures).ToList();

			//cultures.Add(CultureInfo.GetCultureInfo("en-GB"));
			cultures.Add(CultureInfo.GetCultureInfo("en-US"));
			cultures.Add(CultureInfo.GetCultureInfo("pt-BR"));

			cultures.Sort((a, b) => a.Name.CompareTo(b.Name));

			var data = cultures.Where(c => !exclude.Contains(c.Name)).Select(c => new
			{
				id = change.ContainsKey(c.Name) ? change[c.Name] : c.Name,
				name = c.EnglishName,
				nativeName = c.NativeName,
			}).ToList();

			data.Add(new
			{
				id = "md",
				name = "Moldavian",
				nativeName = "Moldovan",
			});

			var json = JsonConvert.SerializeObject(data, Formatting.Indented);

			File.WriteAllText("../../../Website/cultures.json", json);

			var flags = Directory.GetFiles("../../../Website/public/images/flags").Where(f =>
				f.EndsWith(".png") && !data.Any(c => c.id == Path.GetFileNameWithoutExtension(f)));

			foreach (var f in flags)
			{
				//File.Delete(f);
				Console.WriteLine(Path.GetFileNameWithoutExtension(f));
			}

			//Console.ReadLine();
		}
	}
}
